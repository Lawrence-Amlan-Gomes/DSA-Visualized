import { bookmarks } from "../../lib/bookmarks";

export const metadata = { title: "Bookmarks — DSA Visualized" };

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function BookmarksPage() {
  return (
    <div id="view-bookmarks" className="view active">
      <div id="bookmarks">
        <div id="bookmarks-header">
          <h1>Bookmarks</h1>
          <p>Saved links — click a card to open it in a new tab.</p>
        </div>

        {bookmarks.length === 0 ? (
          <p className="empty">No bookmarks yet.</p>
        ) : (
          <div className="bookmark-grid">
            {bookmarks.map((b, i) => (
              <a
                key={i}
                className="bookmark-card"
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="bookmark-card-title">{b.title}</div>
                {b.note && <div className="bookmark-card-note">{b.note}</div>}
                <div className="bookmark-card-url">{hostnameOf(b.url)}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
