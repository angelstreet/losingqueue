import { trackedLink } from './manifest.js';
import fr from '../../content/promotion/templates.fr.json' with { type: 'json' };
import en from '../../content/promotion/templates.en.json' with { type: 'json' };

const TEMPLATES = { fr, en };
const fill = (template, fields) => template.replace(/\{(hook|verdict|url)\}/g, (_, key) => fields[key]);

export function captionsFor(manifest) {
  const { locale, tone } = manifest;
  const template = TEMPLATES[locale]?.[tone];
  if (!template) throw new Error('Invalid locale or tone');
  const templateId = template.id;
  const verdict = manifest.verdict === 'NOT FAIR' && manifest.direction === 'favor' ? 'FAVORED' : manifest.verdict;
  const urlX = trackedLink(manifest.deepLink, 'x', templateId);
  const urlYouTube = trackedLink(manifest.deepLink, 'youtube', templateId);
  const fields = { hook: template.hook, verdict, url: urlX };
  return {
    templateId,
    x: fill(template.x, fields),
    youtubeTitle: fill(template.youtubeTitle, fields),
    youtubeDescription: fill(template.youtubeDescription, { ...fields, url: urlYouTube }),
  };
}
