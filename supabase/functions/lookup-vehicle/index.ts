// lookup-vehicle
// Proxy mot Statens vegvesen sitt kjøretøydata-API.
// Kalles fra frontend med ?regnr=AB12345

const SVV_KEY = Deno.env.get('SVV_API_KEY') ?? '73af5e12-c5fa-4ba3-a008-feb58993238a'
const SVV_URL = 'https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/felles/datautlevering/enkeltoppslag/kjoretoydata'

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() })
  }

  const regnr = new URL(req.url).searchParams.get('regnr')?.toUpperCase().replace(/\s/g, '') ?? ''
  if (!regnr) return json({ error: 'Mangler regnr' }, 400)

  const res = await fetch(`${SVV_URL}?kjennemerke=${encodeURIComponent(regnr)}`, {
    headers: { 'SVV-Authorization': `Apikey ${SVV_KEY}` },
  })

  if (res.status === 204) return json({ error: 'Kjøretøy ikke funnet' }, 404)
  if (!res.ok) return json({ error: `SVV svarte ${res.status}` }, 502)

  const raw = await res.json()
  const kd = raw?.kjoretoydataListe?.[0]
  if (!kd) return json({ error: 'Ingen data' }, 404)

  const teknisk = kd.godkjenning?.tekniskGodkjenning?.tekniskeData
  const generelt = teknisk?.generelt
  const klasse   = kd.godkjenning?.tekniskGodkjenning?.kjoretoyklassifisering

  const merke   = generelt?.merke?.[0]?.merke ?? ''
  const modell  = generelt?.handelsbetegnelse?.[0] ?? ''
  const typeKode = klasse?.tekniskKode?.kodeVerdi ?? ''     // M1, N1, L3, O1, ...
  const karosseri = teknisk?.karosseriOgLasteplan?.karosseritype?.kodeVerdi ?? '' // SA=bobil
  const arskode  = kd.forstegangsregistrering?.registrertForstegangNorgeDato?.slice(0, 4) ?? ''

  // Kategori-mapping
  let category = 'Bil'
  if (karosseri === 'SA') category = 'Bobil'
  else if (/^M/.test(typeKode))  category = 'Bil'
  else if (/^N/.test(typeKode))  category = 'Bil'
  else if (/^L/.test(typeKode))  category = 'MC'
  else if (/^O/.test(typeKode))  category = 'Tilhenger'

  // Tekniske data til beskrivelse
  const dim   = teknisk?.dimensjoner
  const vekt  = teknisk?.vekter
  const motor = teknisk?.motorOgDrivverk?.motor?.[0]
  const drift = motor?.drivstoff?.[0]
  const dekkF = teknisk?.dekkOgFelg?.akselDekkOgFelgKombinasjon?.[0]?.akselDekkOgFelg?.find((a: any) => a.akselId === 1)
  const farge  = teknisk?.karosseriOgLasteplan?.rFarge?.[0]?.kodeNavn ?? ''
  const seter  = teknisk?.persontall?.sitteplasserTotalt
  const drivstoffNavn = drift?.drivstoffKode?.kodeNavn ?? ''
  const effekt = drift?.maksNettoEffekt ? `${drift.maksNettoEffekt} kW` : ''
  const eu     = kd.periodiskKjoretoyKontroll?.kontrollfrist ?? ''
  const vin    = kd.kjoretoyId?.understellsnummer ?? ''
  const maks   = teknisk?.motorOgDrivverk?.maksimumHastighet?.[0]
  const rekkevidde = teknisk?.miljodata?.miljoOgdrivstoffGruppe?.[0]?.forbrukOgUtslipp?.[0]?.rekkeviddeKm

  const lines: string[] = [
    `Merke: ${merke}`,
    `Modell: ${modell}`,
    arskode ? `Årsmodell: ${arskode}` : '',
    farge   ? `Farge: ${farge}` : '',
    drivstoffNavn ? `Drivstoff: ${drivstoffNavn}` : '',
    effekt  ? `Motoreffekt: ${effekt}` : '',
    rekkevidde ? `Rekkevidde: ${rekkevidde} km` : '',
    maks    ? `Maks hastighet: ${maks} km/t` : '',
    dim?.lengde ? `Lengde: ${dim.lengde} mm` : '',
    dim?.bredde ? `Bredde: ${dim.bredde} mm` : '',
    dim?.hoyde  ? `Høyde: ${dim.hoyde} mm` : '',
    vekt?.egenvekt         ? `Egenvekt: ${vekt.egenvekt} kg` : '',
    vekt?.tillattTotalvekt ? `Tillatt totalvekt: ${vekt.tillattTotalvekt} kg` : '',
    vekt?.nyttelast        ? `Nyttelast: ${vekt.nyttelast} kg` : '',
    vekt?.tillattTilhengervektMedBrems ? `Tilhengervekt (med brems): ${vekt.tillattTilhengervektMedBrems} kg` : '',
    seter   ? `Sitteplasser: ${seter}` : '',
    dekkF?.dekkdimensjon ? `Dekk: ${dekkF.dekkdimensjon}` : '',
    eu      ? `EU-kontroll frist: ${eu}` : '',
    vin     ? `Understellsnr: ${vin}` : '',
  ].filter(Boolean)

  return json({
    name:        `${merke} ${modell}`.trim(),
    category,
    description: lines.join('\n'),
    regnr:       kd.kjoretoyId?.kjennemerke ?? regnr,
  })
})

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  })
}
