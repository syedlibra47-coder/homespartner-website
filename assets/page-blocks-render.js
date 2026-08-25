// ============================================================
// Shared page-builder rendering engine.
//
// window.renderPageBlocks(blocks) turns a page's stored block
// array (Supabase custom_pages.layout) into HTML. It's loaded on
// BOTH custom-page.html (the live page) and admin.html (the editor's
// live preview), so what the admin sees while editing is exactly
// what publishes — same function, same output, every time.
// ============================================================

window.PAGE_BLOCK_TYPES = [
  { type: 'heading', label: 'Heading' },
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'button', label: 'Button' },
  { type: 'image-text-split', label: 'Image + Text Split' },
  { type: 'feature-grid', label: 'Feature Grid' },
  { type: 'gallery', label: 'Photo Gallery' },
  { type: 'video', label: 'YouTube Video' },
  { type: 'spacer', label: 'Spacer' },
  { type: 'divider', label: 'Divider' }
];

function pbEscapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function pbBlockClasses(block) {
  const style = block.style || {};
  const classes = ['pb-block', 'pb-' + block.type];
  classes.push('pb-spacing-' + (style.spacing || 'normal'));
  if (style.background) classes.push('pb-bg-' + style.background);
  return classes.join(' ');
}

function pbRenderBlock(block) {
  const p = block.props || {};
  const cls = pbBlockClasses(block);

  switch (block.type) {
    case 'heading': {
      const level = ['h1', 'h2', 'h3'].includes(p.level) ? p.level : 'h2';
      const align = p.align || 'center';
      return `<section class="${cls}"><div class="container" style="text-align:${align};"><${level} class="display">${pbEscapeHtml(p.text)}</${level}></div></section>`;
    }
    case 'text': {
      const align = p.align || 'left';
      const paras = String(p.text || '').split(/\n{2,}/).filter(Boolean)
        .map(t => `<p>${pbEscapeHtml(t).replace(/\n/g, '<br>')}</p>`).join('');
      return `<section class="${cls}"><div class="container pb-text-inner" style="text-align:${align};">${paras}</div></section>`;
    }
    case 'image': {
      if (!p.src) return '';
      return `<section class="${cls}"><div class="container">
        <img src="${pbEscapeHtml(p.src)}" alt="${pbEscapeHtml(p.alt)}" class="pb-image-full">
        ${p.caption ? `<p class="pb-image-caption">${pbEscapeHtml(p.caption)}</p>` : ''}
      </div></section>`;
    }
    case 'button': {
      const align = p.align || 'center';
      const variant = p.variant === 'outline' ? 'btn-outline-navy' : (p.variant === 'navy' ? 'btn-navy' : 'btn-gold');
      return `<section class="${cls}"><div class="container" style="text-align:${align};">
        <a href="${pbEscapeHtml(p.href || '#')}" class="btn ${variant}">${pbEscapeHtml(p.label || 'Learn More')}</a>
      </div></section>`;
    }
    case 'image-text-split': {
      const reverseClass = p.imagePosition === 'right' ? 'pb-split-reverse' : '';
      return `<section class="${cls} ${reverseClass}"><div class="container pb-split-inner">
        <div class="pb-split-media">${p.src ? `<img src="${pbEscapeHtml(p.src)}" alt="${pbEscapeHtml(p.alt)}">` : ''}</div>
        <div class="pb-split-content">
          <h3>${pbEscapeHtml(p.heading)}</h3>
          <p>${pbEscapeHtml(p.text)}</p>
          ${p.buttonLabel ? `<a href="${pbEscapeHtml(p.buttonHref || '#')}" class="btn btn-gold">${pbEscapeHtml(p.buttonLabel)}</a>` : ''}
        </div>
      </div></section>`;
    }
    case 'feature-grid': {
      const items = (p.items || []).map(it => `
        <div class="pb-feature">
          ${it.icon ? `<div class="pb-feature-icon">${pbEscapeHtml(it.icon)}</div>` : ''}
          <h3>${pbEscapeHtml(it.title)}</h3>
          <p>${pbEscapeHtml(it.text)}</p>
        </div>`).join('');
      return `<section class="${cls}"><div class="container"><div class="pb-feature-grid-inner">${items}</div></div></section>`;
    }
    case 'gallery': {
      const imgs = (p.images || []).map(img => `<div class="pb-gallery-item"><img src="${pbEscapeHtml(img.src)}" alt="${pbEscapeHtml(img.alt)}"></div>`).join('');
      return `<section class="${cls}"><div class="container"><div class="pb-gallery-grid">${imgs}</div></div></section>`;
    }
    case 'video': {
      if (!p.videoId) return '';
      return `<section class="${cls}"><div class="container pb-video-inner">
        <div class="pb-video-frame"><iframe src="https://www.youtube.com/embed/${pbEscapeHtml(p.videoId)}" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
        ${p.caption ? `<p class="pb-image-caption">${pbEscapeHtml(p.caption)}</p>` : ''}
      </div></section>`;
    }
    case 'spacer': {
      const height = Number(p.height) > 0 ? Number(p.height) : 40;
      return `<div class="pb-spacer" style="height:${height}px;"></div>`;
    }
    case 'divider': {
      return `<div class="container"><hr class="pb-divider"></div>`;
    }
    default:
      return '';
  }
}

window.renderPageBlocks = function (blocks) {
  return (blocks || []).map(pbRenderBlock).join('\n');
};
