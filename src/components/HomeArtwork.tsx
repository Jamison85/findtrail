const artworkUrl = `${import.meta.env.BASE_URL}findtrail-entryway.webp`

export function HomeArtwork() {
  return (
    <div className="home-artwork" aria-hidden="true">
      <img
        src={artworkUrl}
        alt=""
        width="1536"
        height="1024"
        fetchPriority="high"
        draggable="false"
      />
    </div>
  )
}
