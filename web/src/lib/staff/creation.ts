/** Whether the training-only staff workflow may add new episodes. */
export function staffCreationEnabled(): boolean {
  return process.env.STAFF_CREATION_ENABLED !== "false";
}
