/**
 * MeteoSwiss weather symbol codes (1-42 day, 101-142 night) used by the local
 * forecast (jp2000d0, jww003i0), with the official descriptions from the
 * MeteoSwiss pictogram reference (14 February 2022), as [en, de, fr, it].
 *
 * Source: https://github.com/MeteoSwiss/opendata-localforecast-demos
 * (notebooks/icons/symbols.json). MeteoSwiss allows reusing the symbol numbers
 * and descriptions, not its pictogram graphics.
 *
 * The symbol table below is redistributed under MeteoSwiss's licence:
 *
 * BSD 3-Clause License
 *
 * Copyright (c) 2025, MeteoSwiss
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
export const WEATHER_SYMBOLS: Record<number, readonly [string, string, string, string]> = {
  1: ["sunny", "sonnig", "ensoleillé", "soleggiato"],
  2: ["mostly sunny, some clouds", "ziemlich sonnig", "assez ensoleillé, quelques passages nuageux", "abbastanza soleggiato"],
  3: ["partly sunny, thick passing clouds", "teilweise sonnig", "en partie ensoleillé, passages nuageux parfois denses", "parzialmente soleggiato"],
  4: ["overcast", "wechselnd bewölkt", "nuageux", "nuvoloso"],
  5: ["very cloudy", "bedeckt", "très nuageux", "coperto"],
  6: ["sunny intervals, isolated showers", "Aufhellungen, einzelne Regenschauer", "éclaircies, averses isolées", "nuvolosità variabile con rovesci di pioggia isolati"],
  7: ["sunny intervals, isolated sleet", "Aufhellungen, einzelne Regen- oder Schneeschauer", "éclaircies, averses isolées de pluie et neige mêlées", "nuvolosità variabile con rovesci di pioggia e neve isolati"],
  8: ["sunny intervals, snow showers", "Aufhellungen, einzelne Schneeschauer", "éclaircies, giboulées de neige", "nuvolosità variabile con rovesci di neve isolati"],
  9: ["overcast, some rain showers", "bewölkt, einige Regenschauer", "nuageux, quelques averses", "nuvoloso con rovesci di pioggia"],
  10: ["overcast, some sleet", "bewölkt, einige Regen- oder Schneeschauer", "nuageux, quelques averses de pluie et neige mêlées", "nuvoloso con rovesci di pioggia e neve"],
  11: ["overcast, some snow showers", "bewölkt, einige Schneeschauer", "nuageux, quelques averses de neige", "nuvoloso con rovesci di neve"],
  12: ["sunny intervals, chance of thunderstorms", "Aufhellungen, leicht gewitterhaft", "éclaircies, faiblement orageux", "nuvolosità variabile, con temporali possibili"],
  13: ["sunny intervals, possible thunderstorms", "Aufhellungen und gewitterhaft", "éclaircies, orageux", "nuvolosità variabile e temporalesco"],
  14: ["very cloudy, light rain", "stark bewölkt, schwacher Regen", "très nuageux, faibles pluies", "molto nuvoloso, deboli piogge"],
  15: ["very cloudy, light sleet", "stark bewölkt, schwacher Schnee oder Regen", "très nuageux, faibles chutes de pluie et neige mêlées", "molto nuvoloso, debole pioggia frammista a neve"],
  16: ["very cloudy, light snow showers", "stark bewölkt, schwacher Schnee", "très nuageux, faibles chutes de neige", "molto nuvoloso, deboli nevicate"],
  17: ["very cloudy, intermittent rain", "stark bewölkt, zeitweise Regen", "très nuageux, pluies intermittentes", "molto nuvoloso, piogge intermittenti"],
  18: ["very cloudy, intermittent sleet", "stark bewölkt, zeitweise Schnee oder Regen", "très nuageux, chutes intermittentes de pluie et neige mêlées", "molto nuvoloso, pioggia frammista a neve intermittente"],
  19: ["very cloudy, intermittent snow", "stark bewölkt, zeitweise Schnee", "très nuageux, chutes de neige intermittentes", "molto nuvoloso, nevicate intermittenti"],
  20: ["very overcast with rain", "stark bewölkt, anhaltender Regen", "très nuageux, pluie continue", "molto nuvoloso, piogge intense"],
  21: ["very overcast with frequent sleet", "stark bewölkt, anhaltender Regen oder Schnee", "très nuageux, fréquentes chutes de pluie et neige mêlées", "molto nuvoloso, piogge e nevicate intense"],
  22: ["very overcast with heavy snow", "stark bewölkt, anhaltender Schnee", "très nuageux, fortes chutes de neige", "molto nuvoloso, nevicate intense"],
  23: ["very overcast, slight chance of storms", "stark bewölkt, leicht gewitterhaft", "très nuageux, faiblement orageux", "molto nuvoloso, temporali isolati"],
  24: ["very overcast with storms", "stark bewölkt, gewitterhaft", "très nuageux, orageux", "molto nuvoloso, temporalesco"],
  25: ["very cloudy, very stormy", "stark bewölkt, stark gewitterhaft", "très nuageux, très orageux", "molto nuvoloso con temporali intensi"],
  26: ["high clouds", "Hohe Bewölkung", "nuages élevés", "a tratti nuvolosità ad alta quota"],
  27: ["stratus", "Hochnebel", "stratus", "nebbia alta"],
  28: ["fog", "Nebel", "brouillard", "nebbia"],
  29: ["sunny intervals, scattered showers", "leicht bewölkt, einzelne Regenschauer", "belles éclaircies, averses éparses", "in parte nuvoloso, isolati rovesci"],
  30: ["sunny intervals, scattered snow showers", "leicht bewölkt, leichter Schneefall", "belles éclaircies, giboulées de neige", "in parte nuvoloso, isolati rovesci di neve"],
  31: ["sunny intervals, scattered sleet", "teilweise sonnig, einige Schnee- oder Regenschauer", "belles éclaircies, giboulées de pluie et de neige mêlées", "in parte nuvoloso, con rovesci di pioggia e di neve"],
  32: ["sunny intervals, some showers", "teilweise sonnig, einige Regenschauer", "éclaircies, quelques averses", "in parte nuvoloso con rovesci"],
  33: ["short sunny intervals, frequent rain", "bewölkt, häufige Regenschauer", "rares éclaircies, fréquentes averses", "nuvoloso con frequenti rovesci di pioggia"],
  34: ["short sunny intervals, frequent snowfalls", "bewölkt, häufige Schneeschauer", "rares éclaircies, fréquentes averses de neige", "nuvoloso con frequenti rovesci di neve"],
  35: ["overcast and dry", "bedeckt und trocken", "couvert et sec", "estesa nuvolosità ad alta quota"],
  36: ["partly sunny, slightly stormy", "teilweise sonnig, gewitterhaft", "partiellement ensoleillé, orageux", "in parte nuvoloso, temporali isolati"],
  37: ["partly sunny, stormy snow showers", "teilweise sonnig, Gewitter und Schneeschauer", "partiellement ensoleillé, averses de neige orageuses", "in parte nuvoloso, temporali con rovesci di neve"],
  38: ["overcast, thundery showers", "bewölkt, Gewitter und häufige Regenschauer", "nuageux, averses orageuses", "nuvoloso, temporalesco"],
  39: ["overcast, thundery snow showers", "bewölkt, Gewitter und häufige Schneeschauer", "nuageux, averses de neige orageuses", "nuvoloso, temporali con rovesci di neve"],
  40: ["very cloudly, slightly stormy", "stark bewölkt, leicht gewitterhaft", "très nuageux, faiblement orageux", "molto nuvoloso, con temporali possibili"],
  41: ["overcast, slightly stormy", "bewölkt, leicht gewitterhaft", "nuageux, faiblement orageux", "nuvoloso, con temporali possibili"],
  42: ["very cloudly, thundery snow showers", "stark bewölkt, Gewitter und häufige Schneeschauer", "très nuageux, averses de neige orageuses", "molto nuvoloso, temporali con rovesci di neve"],
  101: ["clear", "klar", "ciel dégagé", "sereno"],
  102: ["slightly overcast", "leicht bewölkt", "peu nuageux", "poco nuvoloso"],
  103: ["heavy cloud formations", "zum Teil bewölkt", "en partie nuageux", "in parte nuvoloso"],
  104: ["overcast", "wechselnd bewölkt", "nuageux", "nuvoloso"],
  105: ["very cloudy", "bedeckt", "très nuageux", "coperto"],
  106: ["overcast, scattered showers", "Aufhellungen, einzelne Regenschauer", "quelques éclaircies, averses par moments", "nuvolosità variabile con rovesci di pioggia isolati"],
  107: ["overcast, scattered rain and snow showers", "Aufhellungen, einzelne Regen- oder Schneeschauer", "quelques éclaircies, par moments averses de pluie et neige mêlées", "nuvolosità variabile con rovesci di pioggia e neve isolati"],
  108: ["overcast, snow showers", "Aufhellungen, einzelne Schneeschauer", "quelques éclaircies, giboulées de neige", "nuvolosità variabile con rovesci di neve isolati"],
  109: ["overcast, some showers", "bewölkt, einige Regenschauer", "nuageux, quelques averses", "nuvoloso con rovesci di pioggia"],
  110: ["overcast, some rain and snow showers", "bewölkt, einige Regen- oder Schneeschauer", "nuageux, quelques averses de pluie et neige mêlées", "nuvoloso con rovesci di pioggia e neve"],
  111: ["overcast, some snow showers", "bewölkt, einige Schneeschauer", "nuageux, quelques averses de neige", "nuvoloso con rovesci di neve"],
  112: ["slightly stormy", "Aufhellungen, leicht gewitterhaft", "faiblement orageux", "nuvolosità variabile, con temporali possibili"],
  113: ["storms", "Aufhellungen und gewitterhaft", "orageux", "nuvolosità variabile e temporalesco"],
  114: ["very cloudy, light rain", "stark bewölkt, schwacher Regen", "très nuageux, faibles pluies", "molto nuvoloso, deboli piogge"],
  115: ["very cloudy, light rain and snow showers", "stark bewölkt, schwacher Schnee oder Regen", "très nuageux, faibles chutes de pluie et neige mêlées", "molto nuvoloso, debole pioggia frammista a neve"],
  116: ["very cloudy, light snowfall", "stark bewölkt, schwacher Schnee", "très nuageux, faibles chutes de neige", "molto nuvoloso, deboli nevicate"],
  117: ["very cloudy, intermittent rain", "stark bewölkt, zeitweise Regen", "très nuageux, pluies intermittences", "molto nuvoloso, piogge intermittenti"],
  118: ["very cloudy, intermittant mixed rain and snowfall", "stark bewölkt, zeitweise Schnee oder Regen", "très nuageux, chutes intermittentes de pluie et neige mêlées", "molto nuvoloso, pioggia frammista a neve intermittente"],
  119: ["very cloudy, intermittent snowfall", "stark bewölkt, zeitweise Schnee", "très nuageux, chutes de neige intermittentes", "molto nuvoloso, nevicate intermittenti"],
  120: ["very cloudy, constant rain", "stark bewölkt, anhaltender Regen", "très nuageux, pluie continue", "molto nuvoloso, piogge intense"],
  121: ["very cloudy, frequent rain and snowfall", "stark bewölkt, anhaltender Regen oder Schnee", "très nuageux, fréquentes chutes de pluie et neige mêlées", "molto nuvoloso, piogge e nevicate intense"],
  122: ["very cloudy, heavy snowfall", "stark bewölkt, anhaltender Schnee", "très nuageux, fortes chutes de neige", "molto nuvoloso, nevicate intense"],
  123: ["very cloudy, slightly stormy", "stark bewölkt, leicht gewitterhaft", "très nuageux, faiblement orageux", "molto nuvoloso, temporali isolati"],
  124: ["very cloudy, stormy", "stark bewölkt, gewitterhaft", "très nuageux, orageux", "molto nuvoloso, temporalesco"],
  125: ["very cloudy, storms", "stark bewölkt, stark gewitterhaft", "très nuageux, très orageux", "molto nuvoloso con temporali intensi"],
  126: ["high cloud", "Hohe Bewölkung", "nuages élevés", "a tratti nuvolosità ad alta quota"],
  127: ["stratus", "Hochnebel", "stratus", "nebbia alta"],
  128: ["fog", "Nebel", "brouillard", "nebbia"],
  129: ["slightly overcast, scattered showers", "leicht bewölkt, einzelne Regenschauer", "peu nuageux, averses éparses", "in parte nuvoloso, isolati rovesci"],
  130: ["slightly overcast, scattered snowfall", "leicht bewölkt, leichter Schneefall", "peu nuageux, giboulées de neige", "in parte nuvoloso, isolati rovesci di neve"],
  131: ["slightly overcast, rain and snow showers", "leicht bewölkt, einige Schnee- oder Regenschauer", "peu nuageux, giboulées de pluie et neige mêlées", "in parte nuvoloso, con alcuni rovesci di pioggia e di neve"],
  132: ["slightly overcast, some showers", "leicht bewölkt, einige Regenschauer", "peu nuageux, quelques averses", "in parte nuvoloso con alcuni rovesci"],
  133: ["overcast, frequent snow showers", "bewölkt, häufige Regenschauer", "nuageux, fréquentes averses", "nuvoloso con frequenti rovesci di pioggia"],
  134: ["overcast, frequent snow showers", "bewölkt, häufige Schneeschauer", "nuageux, fréquentes averses de neige", "nuvoloso con frequenti rovesci di neve"],
  135: ["overcast and dry", "bedeckt und trocken", "couvert et sec", "estesa nuvolosità ad alta quota"],
  136: ["slightly overcast, slightly stormy", "Aufhellungen, gewitterhaft", "en partie nuageux, orageux", "in parte nuvoloso, temporali isolati"],
  137: ["slightly overcast, stormy snow showers", "leicht bewölkt, Gewitter und Schneeschauer", "en partie nuageux, averses de neige orageuses", "in parte nuvoloso, temporali con rovesci di neve"],
  138: ["overcast, thundery showers", "bewölkt, Gewitter und häufige Regenschauer", "nuageux, averses orageuses", "nuvoloso, temporalesco"],
  139: ["overcast, thundery snow showers", "bewölkt, Gewitter und häufige Schneeschauer", "nuageux, averses de neige orageuses", "nuvoloso, temporali con rovesci di neve"],
  140: ["very cloudly, slightly stormy", "stark bewölkt, leicht gewitterhaft", "très nuageux, faiblement orageux", "molto nuvoloso, con temporali possibili"],
  141: ["overcast, slightly stormy", "bewölkt, leicht gewitterhaft", "nuageux, faiblement orageux", "nuvoloso, con temporali possibili"],
  142: ["very cloudly, thundery snow showers", "stark bewölkt, Gewitter und häufige Schneeschauer", "très nuageux, averses de neige orageuses", "molto nuvoloso, temporali con rovesci di neve"],
};
