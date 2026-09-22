/** Alles, was als HTML über dem 3D-Bild liegt: Überblendung, Hinweis, Ziel-Anzeige. */
export class Overlay {
  private readonly fade = el('div', 'fade');
  private readonly hint = el('div', 'hint', '← → laufen &nbsp;·&nbsp; Leertaste springen');
  private readonly win = el('div', 'win hidden');

  constructor(parent: HTMLElement, onRestart: () => void) {
    this.win.innerHTML = `
      <h1>Geschafft!</h1>
      <p class="time"></p>
      <button type="button">Nochmal <small>(Enter)</small></button>`;
    const button = this.win.querySelector('button')!;
    button.addEventListener('click', () => {
      button.blur(); // sonst löst die Leertaste zum Springen den Button erneut aus
      onRestart();
    });
    parent.append(this.fade, this.hint, this.win);
  }

  setFade(dark: boolean): void {
    this.fade.classList.toggle('dark', dark);
  }

  hideHint(): void {
    this.hint.classList.add('hidden');
  }

  showWin(seconds: number): void {
    this.win.querySelector('.time')!.textContent = `Zeit: ${seconds.toFixed(1).replace('.', ',')} Sekunden`;
    this.win.classList.remove('hidden');
  }

  reset(): void {
    this.win.classList.add('hidden');
    this.hint.classList.remove('hidden');
    this.setFade(false);
  }
}

function el(tag: string, className: string, html = ''): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.innerHTML = html;
  return node;
}
