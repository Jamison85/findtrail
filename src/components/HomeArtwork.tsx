const artworkUrl = `${import.meta.env.BASE_URL}findtrail-reset-lake.webp`

export function HomeArtwork() {
  return (
    <div className="home-artwork" role="img" aria-label="A still lake at dusk">
      <img
        src={artworkUrl}
        alt=""
        width="1080"
        height="1920"
        fetchPriority="high"
        draggable="false"
      />
    </div>
  )
}
