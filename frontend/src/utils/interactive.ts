export const isInteractiveElement = (
  target: EventTarget | null,
  currentTarget?: EventTarget | null
): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const interactiveAncestor = target.closest(
    'a, button, input, select, textarea, summary, [role="button"], [role="link"], [data-disable-card-click="true"]'
  )

  if (!interactiveAncestor) {
    return false
  }

  return interactiveAncestor !== currentTarget
}
