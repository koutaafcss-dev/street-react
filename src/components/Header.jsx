export default function Header({ onStartPost, searchText, setSearchText }) {
  return (
    <div style={styles.header}>
      <h2 style={styles.title}>善意マップ</h2>

      <input
        type="text"
        placeholder="検索..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={styles.search}
      />

      <button style={styles.button} onClick={onStartPost}>
        投稿する
      </button>
    </div>
  );
}

const styles = {
  header: {
    position: "absolute",
    top: 0,
    width: "100%",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    padding: "10px",
    backgroundColor: "white",
    zIndex: 1000,
  },
  title: { margin: 0 },
  search: {
    flex: 1,
    padding: "6px",
  },
  button: {
    padding: "8px 12px",
    cursor: "pointer",
  },
};