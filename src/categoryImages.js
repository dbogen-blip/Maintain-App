const SLUGS = {
  'Bil':                            'bil',
  'Båt':                            'bat',
  'Hus':                            'hus',
  'Hage':                           'hage',
  'Sykkel':                         'sykkel',
  'MC/ATV':                         'mc',
  'Tilhenger':                      'tilhenger',
  'Campingvogn':                    'campingvogn',
  'Elektriske og manuelle verktøy': 'verktoy',
  'Bensindrevne verktøy':           'bensindrevet',
  'Leilighet':                      'leilighet',
  'Hytte':                          'hytte',
  'Bobil':                          'bobil',
  'Annet':                          'annet',
}

function slug(category) {
  return SLUGS[category] ?? SLUGS['Annet']
}

export function categoryImage(category) {
  return `/category-images/${slug(category)}.jpg`
}

/** <img> som prøver .png først, faller tilbake til .jpg automatisk */
export function categoryImgProps(category) {
  const base = `/category-images/${slug(category)}`
  return {
    src: `${base}.png`,
    onError(e) {
      if (!e.target.dataset.triedJpg) {
        e.target.dataset.triedJpg = '1'
        e.target.src = `${base}.jpg`
      }
    },
  }
}
