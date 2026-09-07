import './ui/styles.css';
import { Observatory } from './app/Observatory';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('The observatory mount point is missing.');
const observatory = new Observatory(root);
void observatory.start();

const onPageHide = (event: PageTransitionEvent): void => { if (!event.persisted) dispose(); };
function dispose(): void {
  window.removeEventListener('pagehide', onPageHide);
  observatory.dispose();
}
window.addEventListener('pagehide', onPageHide);
if (import.meta.hot) import.meta.hot.dispose(dispose);
