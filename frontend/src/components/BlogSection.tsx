import { upcomingPosts } from "@/content/blog";

export function BlogSection({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";
  const PostHeading = standalone ? "h2" : "h3";
  return <section id="blog" className={`blog-section page-shell ${standalone ? "blog-section--index" : "section-rule"}`} aria-labelledby="blog-title">
    <header className="blog-section__intro">
      <Heading id="blog-title" className="blog-section__title"><em>Notes on<br/>learning languages.</em></Heading>
      <span className="blog-section__accent" aria-hidden="true"/>
      <p>Thoughts on memory, motivation and making language practice stick.</p>
    </header>
    <ul className="blog-section__posts" aria-label="Upcoming blog posts">
      {upcomingPosts.map(post => <li key={post.slug}><article>
        <PostHeading>{post.title}</PostHeading>
        <p className="blog-section__status">Coming soon</p>
      </article></li>)}
    </ul>
    <a className="blog-section__link" href={standalone ? "/" : "/blog/"}>{standalone ? "Back to Language Partner" : "Visit the blog"}<span aria-hidden="true"> →</span></a>
  </section>;
}
