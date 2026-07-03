import { useState } from "react";
import handbook from "./data/handbook.json";

function slugToHref(id) {
  return `#${id}`;
}

function annotateFigureBlocks(blocks, figureEntries, fallbackEntries) {
  return blocks.map((block, index) => {
    if (block.type !== "image") {
      return block;
    }

    const caption = blocks[index + 1]?.type === "caption" ? blocks[index + 1].text : null;
    if (!caption) {
      return block;
    }

    const figureNumber = figureEntries.length + 1;
    const figureId = `figure-${figureNumber}`;
    figureEntries.push({
      id: figureId,
      label: fallbackEntries[figureNumber - 1] || caption,
    });

    return {
      ...block,
      figureId,
    };
  });
}

function RenderBlocks({ blocks }) {
  const output = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (block.type === "list-item") {
      const items = [block.text];
      while (blocks[index + 1]?.type === "list-item") {
        index += 1;
        items.push(blocks[index].text);
      }

      output.push(
        <ul className="content-list" key={`list-${index}`}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (block.type === "image") {
      const nextBlock = blocks[index + 1];
      const caption = nextBlock?.type === "caption" ? nextBlock.text : null;

      if (caption) {
        index += 1;
      }

      output.push(
        <figure className="figure-card" id={block.figureId} key={`image-${index}`}>
          <div className="figure-grid">
            {block.images.map((imagePath) => (
              <img
                key={imagePath}
                className="figure-image"
                src={imagePath}
                alt={caption || "Hình minh họa tài liệu ParknGo"}
                loading="lazy"
              />
            ))}
          </div>
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>,
      );
      continue;
    }

    if (block.type === "table") {
      const singleCell = block.rows.length === 1 && block.rows[0].length === 1;
      output.push(
        <div className="table-card" key={`table-${index}`}>
          {singleCell ? (
            <p>{block.rows[0][0]}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${index}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${index}-${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>,
      );
      continue;
    }

    if (block.type === "caption") {
      output.push(
        <p className="inline-caption" key={`caption-${index}`}>
          {block.text}
        </p>,
      );
      continue;
    }

    if (block.type === "paragraph") {
      const isIntroHeading = block.text === "Mục tiêu sử dụng tài liệu";
      output.push(
        isIntroHeading ? (
          <h3 className="subheading" key={`paragraph-${index}`}>
            {block.text}
          </h3>
        ) : (
          <p className="content-paragraph" key={`paragraph-${index}`}>
            {block.text}
          </p>
        ),
      );
    }
  }

  return output;
}

function App() {
  const {
    title,
    version,
    heroImage,
    introBlocks,
    figureIndex: fallbackFigureIndex,
    sections,
    stats,
  } = handbook;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFigureIndexOpen, setIsFigureIndexOpen] = useState(false);
  const figureEntries = [];
  const preparedIntroBlocks = annotateFigureBlocks(introBlocks, figureEntries, fallbackFigureIndex);
  const preparedSections = sections.map((section) => ({
    ...section,
    blocks: annotateFigureBlocks(section.blocks, figureEntries, fallbackFigureIndex),
  }));
  const navItems = [
    { id: "intro", label: "Tổng quan" },
    { id: "figure-index", label: "Danh mục hình" },
    ...preparedSections.map((section, index) => ({
      id: section.id,
      label: `${String(index + 1).padStart(2, "0")} ${section.title}`,
    })),
  ];

  return (
    <div className="page-shell">
      <div className="topbar">
        <a href="#intro" className="brand-mark">
          <span>ParknGo</span>
          Handbook
        </a>
        <div className="topnav-menu">
          <button
            type="button"
            className="topnav-trigger"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="topnav-list"
          >
            Mục lục
          </button>
          {isMenuOpen ? (
            <nav id="topnav-list" className="topnav-dropdown" aria-label="Điều hướng tài liệu">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={slugToHref(item.id)}
                  className="topnav-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </div>

      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">ParknGo Knowledge Hub</span>
          <h1>{title}</h1>
          <p className="hero-lead">
      Tổng hợp các lỗi thường gặp và cách kiểm tra, xử lý.
      Ghi lại các lưu ý kỹ thuật, cấu hình và kinh nghiệm triển khai thực tế.
      Giúp Team ESC và SDx có chung cách xử lý, giảm thời gian tìm nguyên nhân khi gặp sự cố.
          </p>
          <div className="hero-actions">
            <a href="#intro" className="primary-link">
              Bắt đầu đọc
            </a>
            <a href="#figure-index" className="secondary-link">
              Danh mục hình
            </a>
          </div>
          <dl className="hero-stats">
            <div>
              <dt>Phiên bản</dt>
              <dd>{version}</dd>
            </div>
            <div>
              <dt>Chuyên mục</dt>
              <dd>{stats.sectionCount}</dd>
            </div>
            <div>
              <dt>Hình ảnh</dt>
              <dd>{stats.figureCount}</dd>
            </div>
          </dl>
        </div>
        <div className="hero-media">
          {heroImage ? (
            <img src={heroImage} alt="Bìa handbook ParknGo" className="hero-image" />
          ) : null}
        </div>
      </header>

      <main className="main-content">
        <section id="intro" className="panel">
          <div className="panel-heading">
            <span>Giới thiệu</span>
            <h2>Tài liệu vận hành ParknGo đã được chuyển sang dạng web</h2>
          </div>
          <RenderBlocks blocks={preparedIntroBlocks} />
        </section>

        <section id="figure-index" className="panel">
          <div className="panel-heading">
            <span>Danh mục hình</span>
            <h2>Tra cứu nhanh các ảnh hướng dẫn trong tài liệu</h2>
          </div>
          <button
            type="button"
            className="figure-index-trigger"
            onClick={() => setIsFigureIndexOpen((open) => !open)}
            aria-expanded={isFigureIndexOpen}
            aria-controls="figure-index-list"
          >
            {isFigureIndexOpen ? "Ẩn danh mục hình" : "Hiện danh mục hình"}
          </button>
          {isFigureIndexOpen ? (
            <div id="figure-index-list" className="figure-index-list">
              {figureEntries.map((item) => (
                <a className="figure-index-item" key={item.id} href={slugToHref(item.id)}>
                  {item.label}
                </a>
              ))}
            </div>
          ) : null}
        </section>

        {preparedSections.map((section, index) => (
          <section id={section.id} className="panel" key={section.id}>
            <div className="panel-heading">
              <span>Mục {String(index + 1).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
            </div>
            <RenderBlocks blocks={section.blocks} />
          </section>
        ))}
      </main>
    </div>
  );
}

export default App;
