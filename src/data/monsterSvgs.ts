// Static SVG imports
import batWingSvg from '../../public/icons/ffffff/transparent/1x1/lorc/bat-wing.svg?raw';
import beastEyeSvg from '../../public/icons/ffffff/transparent/1x1/lorc/beast-eye.svg?raw';
import alienSkullSvg from '../../public/icons/ffffff/transparent/1x1/lorc/alien-skull.svg?raw';
import bleedingEyeSvg from '../../public/icons/ffffff/transparent/1x1/lorc/bleeding-eye.svg?raw';

import boneGnawerSvg from '../../public/icons/ffffff/transparent/1x1/lorc/bone-gnawer.svg?raw';
import brainSvg from '../../public/icons/ffffff/transparent/1x1/lorc/brain.svg?raw';
import catSvg from '../../public/icons/ffffff/transparent/1x1/lorc/cat.svg?raw';
import burningBookSvg from '../../public/icons/ffffff/transparent/1x1/lorc/burning-book.svg?raw';

import daemonSkullSvg from '../../public/icons/ffffff/transparent/1x1/lorc/daemon-skull.svg?raw';
import diabloSkullSvg from '../../public/icons/ffffff/transparent/1x1/lorc/diablo-skull.svg?raw';
import dragonHeadSvg from '../../public/icons/ffffff/transparent/1x1/lorc/dragon-head.svg?raw';
import evilMoonSvg from '../../public/icons/ffffff/transparent/1x1/lorc/evil-moon.svg?raw';

import evilTreeSvg from '../../public/icons/ffffff/transparent/1x1/lorc/evil-tree.svg?raw';
import fireAxeSvg from '../../public/icons/ffffff/transparent/1x1/lorc/fire-axe.svg?raw';
import ghostSvg from '../../public/icons/ffffff/transparent/1x1/lorc/ghost.svg?raw';
import lightningStormSvg from '../../public/icons/ffffff/transparent/1x1/lorc/lightning-storm.svg?raw';

import snailSvg from '../../public/monsters/snail.svg?raw';
import batSvg from '../../public/monsters/bat.svg?raw';
import birdSvg from '../../public/monsters/bird.svg?raw';
import rabbitSvg from '../../public/monsters/rabbit.svg?raw';

const SVG_MAP: Record<string, string> = {
  'bat-wing': batWingSvg,
  'beast-eye': beastEyeSvg,
  'alien-skull': alienSkullSvg,
  'bleeding-eye': bleedingEyeSvg,
  
  'bone-gnawer': boneGnawerSvg,
  'brain': brainSvg,
  'cat': catSvg,
  'burning-book': burningBookSvg,
  
  'daemon-skull': daemonSkullSvg,
  'diablo-skull': diabloSkullSvg,
  'dragon-head': dragonHeadSvg,
  'evil-moon': evilMoonSvg,
  
  'evil-tree': evilTreeSvg,
  'fire-axe': fireAxeSvg,
  'ghost': ghostSvg,
  'lightning-storm': lightningStormSvg,
  
  'snail': snailSvg,
  'bat': batSvg,
  'bird': birdSvg,
  'rabbit': rabbitSvg
};

/**
 * Return the raw SVG string for a given monster name.
 * Handles: capitalisation differences, path prefixes, .svg extension.
 * Returns null if unknown.
 */
export function getMonsterSvg(name: string): string | null {
  // Strip leading path components and .svg extension
  let base = name;
  if (base.includes('/')) base = base.substring(base.lastIndexOf('/') + 1);
  if (base.toLowerCase().endsWith('.svg')) base = base.slice(0, -4);

  const lower = base.toLowerCase();
  return SVG_MAP[lower] ?? null;
}
