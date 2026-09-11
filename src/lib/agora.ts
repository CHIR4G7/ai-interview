/**
 * Single source of truth for the AI interviewer's RTC UID.
 *
 * Both the browser (to tell the agent's audio track apart from the candidate's)
 * and the invite route (to register the agent under this UID) read it from here.
 * Defining it in two places silently desynchronises the two sides.
 */
export const AGENT_RTC_UID = 123456

/** Channel names are scoped per interview attempt so sessions never collide. */
export function buildChannelName(interviewId: string) {
  return `interview-${interviewId}-${Date.now()}`
}
