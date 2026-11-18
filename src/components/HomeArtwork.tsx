const artworkUrl = `${import.meta.env.BASE_URL}home-memory-trail.webp`

export function HomeArtwork() {
  return (
    <div className="home-artwork" role="img" aria-label="A warmly lit room with a winding path between everyday places">
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
