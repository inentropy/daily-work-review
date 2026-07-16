export type PlanStatus =
  | "todo"
  | "in_progress"
  | "completed"
  | "delayed";

export type PlanTask = {
  id: string;
  text: string;
  status: PlanStatus;
  carriedFrom?: string;
};

export const PLAN_STATUSES: {
  value: PlanStatus;
  label: string;
}[] = [
  { value: "todo", label: "待开始" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "delayed", label: "延期" },
];

const statusValues = new Set<PlanStatus>(
  PLAN_STATUSES.map((item) => item.value),
);

export const createPlanTask = (): PlanTask => ({
  id:
    globalThis.crypto?.randomUUID?.() ??
    `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  text: "",
  status: "todo",
});

export const normalizePlanTasks = (
  value: unknown,
  recordDate: string,
): PlanTask[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `${recordDate}-legacy-plan-${index}`,
        text: item,
        status: "todo",
      };
    }

    if (item && typeof item === "object") {
      const candidate = item as Partial<PlanTask>;
      const status = statusValues.has(
        candidate.status as PlanStatus,
      )
        ? (candidate.status as PlanStatus)
        : "todo";

      return {
        id:
          typeof candidate.id === "string" &&
          candidate.id
            ? candidate.id
            : `${recordDate}-plan-${index}`,
        text:
          typeof candidate.text === "string"
            ? candidate.text
            : "",
        status,
        ...(typeof candidate.carriedFrom === "string"
          ? { carriedFrom: candidate.carriedFrom }
          : {}),
      };
    }

    return {
      id: `${recordDate}-plan-${index}`,
      text: "",
      status: "todo",
    };
  });
};

export const carryForwardPlans = ({
  previousPlans,
  currentPlans,
  carriedTaskIds,
  previousDate,
}: {
  previousPlans: PlanTask[];
  currentPlans: PlanTask[];
  carriedTaskIds: string[];
  previousDate: string;
}) => {
  const processedIds = new Set(carriedTaskIds);
  const currentIds = new Set(
    currentPlans.map((task) => task.id),
  );

  const eligible = previousPlans.filter(
    (task) =>
      task.text.trim() &&
      task.status !== "completed" &&
      !processedIds.has(task.id),
  );

  const additions = eligible
    .filter((task) => !currentIds.has(task.id))
    .map((task) => ({
      ...task,
      carriedFrom: previousDate,
    }));

  return {
    plans: [...additions, ...currentPlans],
    carriedTaskIds: [
      ...carriedTaskIds,
      ...eligible
        .map((task) => task.id)
        .filter((id) => !processedIds.has(id)),
    ],
    added: additions.length,
  };
};
