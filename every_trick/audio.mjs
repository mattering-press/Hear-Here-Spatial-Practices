// The length of an MP3, read from the file itself, so that a podcast player can show it before anything is loaded
// (filters/embeds.lua writes it into the page). No decoder is needed: the length comes from the Xing/Info or VBRI
// header that encoders write into the first frame, or, for a file without one (constant bit rate), from its size
// and bit rate.
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';

const BITRATES = {   // kbit/s by bitrate index; MPEG-1 Layer III, and MPEG-2/2.5 Layer III
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };   // by version bits

function read(fd, position, length) {
  const buf = Buffer.alloc(length);
  const n = readSync(fd, buf, 0, length, position);
  return buf.subarray(0, n);
}

// Seconds, rounded to tenths, or null if the file is not an MP3 this can read.
export function mp3Duration(file) {
  const fd = openSync(file, 'r');
  try {
    const size = fstatSync(fd).size;
    let start = 0;
    const id3 = read(fd, 0, 10);
    if (id3.toString('latin1', 0, 3) === 'ID3') {
      start = 10 + ((id3[6] & 0x7f) << 21 | (id3[7] & 0x7f) << 14 | (id3[8] & 0x7f) << 7 | (id3[9] & 0x7f)) + (id3[5] & 0x10 ? 10 : 0);
    }
    const head = read(fd, start, 65536);
    let i = 0;
    for (; i < head.length - 4; i++) {   // the first frame header: 11 sync bits, Layer III, a valid bit rate and sample rate
      if (head[i] !== 0xff || (head[i + 1] & 0xe0) !== 0xe0) continue;
      const versionBits = (head[i + 1] >> 3) & 3, layer = (head[i + 1] >> 1) & 3;
      const rateIndex = (head[i + 2] >> 2) & 3, bitrateIndex = head[i + 2] >> 4;
      if (versionBits !== 1 && layer === 1 && rateIndex !== 3 && bitrateIndex > 0 && bitrateIndex < 15) break;
    }
    if (i >= head.length - 4) return null;
    const versionBits = (head[i + 1] >> 3) & 3, mpeg1 = versionBits === 3;
    const sampleRate = RATES[versionBits][(head[i + 2] >> 2) & 3];
    const bitrate = BITRATES[mpeg1 ? 1 : 2][head[i + 2] >> 4] * 1000;
    const mono = (head[i + 3] >> 6) === 3;
    const samplesPerFrame = mpeg1 ? 1152 : 576;
    const round = (s) => Math.round(s * 10) / 10;
    // Xing or Info header, after the side information
    const xing = i + 4 + (mpeg1 ? (mono ? 17 : 32) : (mono ? 9 : 17));
    const tag = head.toString('latin1', xing, xing + 4);
    if ((tag === 'Xing' || tag === 'Info') && head.readUInt32BE(xing + 4) & 1) {
      return round((head.readUInt32BE(xing + 8) * samplesPerFrame) / sampleRate);
    }
    if (head.toString('latin1', i + 36, i + 40) === 'VBRI') return round((head.readUInt32BE(i + 36 + 14) * samplesPerFrame) / sampleRate);
    // constant bit rate: the audio's bytes over the bit rate, without an ID3v1 tag at the end
    const end = read(fd, size - 128, 3).toString('latin1') === 'TAG' ? size - 128 : size;
    return round(((end - start - i) * 8) / bitrate);
  } finally {
    closeSync(fd);
  }
}
