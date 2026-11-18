export function Footer() {
  return <footer className="site-footer page-shell">
    <a href="/#top" className="footer-wordmark">Language Partner</a>
    <nav aria-label="Footer navigation"><a href="/#how-it-works">Explore the app</a><a href="/#about">Our story</a><a href="/#questions">Questions</a><a href="/blog/">Blog</a><a href="/#get-started">Get started</a></nav>
    <p>© {new Date().getFullYear()} Language Partner</p>
  </footer>;
}
