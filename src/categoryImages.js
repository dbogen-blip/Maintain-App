// Maps category names to image slug filenames served from /public/category-images/.
// Unknown categories fall back to the 'annet' slug so the UI always has an image.
// categoryImgProps() tries .png first and falls back to .jpg via an onError
// handler — this lets us store images in whichever format without updating code.
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
  'Lastebil/Buss':                  'annet',
  'Traktor/Maskin':                 'traktor_makskin',
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
