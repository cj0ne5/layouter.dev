const _mdConverter = new showdown.Converter({ openLinksInNewWindow: true });

function openAboutModal() {
  const modal = document.getElementById('about-modal');
  const content = document.getElementById('about-content');
  modal.style.display = 'flex';

  if (content.dataset.loaded) return;

  fetch('README.md')
    .then(r => r.text())
    .then(md => {
      content.innerHTML = _mdConverter.makeHtml(md);
      content.dataset.loaded = '1';
    })
    .catch(() => {
      content.textContent = 'Could not load README.md.';
    });
}

function closeAboutModal(e) {
  if (e && e.target !== document.getElementById('about-modal')) return;
  document.getElementById('about-modal').style.display = 'none';
}
