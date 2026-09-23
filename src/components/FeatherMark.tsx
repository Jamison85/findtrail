interface FeatherMarkProps {
  className?: string
}

const FEATHER_SRC = `${import.meta.env.BASE_URL}findtrail-natural-feather-v2.webp`

export function FeatherMark({ className }: FeatherMarkProps) {
  return <img className={className} src={FEATHER_SRC} alt="" aria-hidden="true" draggable={false} />
}
