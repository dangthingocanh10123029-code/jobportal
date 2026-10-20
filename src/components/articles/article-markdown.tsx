import type { Block, Inline } from './markdown';

function InlineText({ text }: { text: Inline }) {
  return <>{text.map((part, i) => (part.bold ? <strong key={i}>{part.text}</strong> : part.text))}</>;
}

/** Renders parsed blocks as text nodes only (no dangerouslySetInnerHTML): HTML in an article shows as text. */
export function ArticleMarkdown({ blocks }: { blocks: Block[] }) {
  return (
    <div className="article-body">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h2': return <h2 id={block.id} key={i}><InlineText text={block.text} /></h2>;
          case 'h3': return <h3 id={block.id} key={i}><InlineText text={block.text} /></h3>;
          case 'ul': return <ul key={i}>{block.items.map((item, j) => <li key={j}><InlineText text={item} /></li>)}</ul>;
          case 'ol': return <ol key={i}>{block.items.map((item, j) => <li key={j}><InlineText text={item} /></li>)}</ol>;
          default: return <p key={i}><InlineText text={block.text} /></p>;
        }
      })}
    </div>
  );
}
