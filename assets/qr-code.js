/**
 * qr-code.js — Shared QR Code Component
 * Minimal QR Code generator (byte mode, Level L, versions 1-4)
 * Renders to a canvas element with theme-aware styling.
 */
(function () {
    'use strict';

    /* ===== GF(256) Arithmetic ===== */
    var EXP = new Array(256), LOG = new Array(256);
    (function () {
        var x = 1;
        for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x >= 256) x ^= 0x11d; }
        EXP[255] = EXP[0];
    })();
    function gfMul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[(LOG[a] + LOG[b]) % 255]; }

    /* ===== Reed-Solomon ===== */
    function rsGenPoly(n) {
        var g = [1];
        for (var i = 0; i < n; i++) {
            var t = new Array(g.length + 1).fill(0);
            for (var j = 0; j < g.length; j++) { t[j] ^= g[j]; t[j + 1] ^= gfMul(g[j], EXP[i]); }
            g = t;
        }
        return g;
    }
    function rsEncode(msg, nsym) {
        var gen = rsGenPoly(nsym), res = msg.slice().concat(new Array(nsym).fill(0));
        for (var i = 0; i < msg.length; i++) {
            var c = res[i]; if (c !== 0) for (var j = 1; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], c);
        }
        return res.slice(msg.length);
    }

    /* ===== Version Config (Level L, single block) ===== */
    var VCFG = [
        null,
        { s: 21, dc: 19, ec: 7, ap: [] },
        { s: 25, dc: 34, ec: 10, ap: [6, 18] },
        { s: 29, dc: 55, ec: 15, ap: [6, 22] },
        { s: 33, dc: 80, ec: 20, ap: [6, 26] }
    ];

    function pickVersion(len) {
        var need = len + 3; // mode(1) + count(1) + data + terminator overhead ~1
        for (var v = 1; v <= 4; v++) if (VCFG[v].dc >= need) return v;
        return 4;
    }

    /* ===== Data Encoding (Byte mode) ===== */
    function encodeData(text, ver) {
        var cfg = VCFG[ver], bits = [];
        function push(val, count) { for (var i = count - 1; i >= 0; i--) bits.push((val >> i) & 1); }
        push(4, 4); // byte mode indicator
        push(text.length, ver <= 9 ? 8 : 16);
        for (var i = 0; i < text.length; i++) push(text.charCodeAt(i), 8);
        // Terminator
        var cap = cfg.dc * 8;
        var term = Math.min(4, cap - bits.length);
        for (var i = 0; i < term; i++) bits.push(0);
        while (bits.length % 8 !== 0) bits.push(0);
        // Pad codewords
        var pads = [0xEC, 0x11], pi = 0;
        while (bits.length < cap) { push(pads[pi], 8); pi ^= 1; }
        // Convert to bytes
        var bytes = [];
        for (var i = 0; i < bits.length; i += 8) {
            var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; bytes.push(b);
        }
        var ec = rsEncode(bytes, cfg.ec);
        return bytes.concat(ec);
    }

    /* ===== Matrix Construction ===== */
    function createMatrix(size) {
        var m = [], r = [];
        for (var i = 0; i < size; i++) { m.push(new Array(size).fill(0)); r.push(new Array(size).fill(false)); }
        return { m: m, r: r };
    }

    function setModule(mat, row, col, val) {
        if (row >= 0 && row < mat.m.length && col >= 0 && col < mat.m.length) {
            mat.m[row][col] = val ? 1 : 0;
            mat.r[row][col] = true;
        }
    }

    function placeFinder(mat, sr, sc) {
        for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
            var inF = r >= 0 && r <= 6 && c >= 0 && c <= 6;
            var dark = inF && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
            setModule(mat, sr + r, sc + c, dark);
        }
    }

    function placeAlign(mat, cr, cc) {
        for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++) {
            var dark = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
            setModule(mat, cr + r, cc + c, dark);
        }
    }

    function placeTiming(mat, size) {
        for (var i = 8; i < size - 8; i++) {
            if (!mat.r[6][i]) { mat.m[6][i] = (i % 2 === 0) ? 1 : 0; mat.r[6][i] = true; }
            if (!mat.r[i][6]) { mat.m[i][6] = (i % 2 === 0) ? 1 : 0; mat.r[i][6] = true; }
        }
    }

    function buildMatrix(ver) {
        var cfg = VCFG[ver], size = cfg.s, mat = createMatrix(size);
        placeFinder(mat, 0, 0);
        placeFinder(mat, 0, size - 7);
        placeFinder(mat, size - 7, 0);
        placeTiming(mat, size);
        // Dark module
        setModule(mat, 4 * ver + 9, 8, true);
        // Alignment
        var ap = cfg.ap;
        if (ap.length) {
            for (var i = 0; i < ap.length; i++) for (var j = 0; j < ap.length; j++) {
                if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) continue;
                placeAlign(mat, ap[i], ap[j]);
            }
        }
        // Reserve format info areas
        for (var i = 0; i < 8; i++) {
            if (!mat.r[8][i]) mat.r[8][i] = true;
            if (!mat.r[8][size - 1 - i]) mat.r[8][size - 1 - i] = true;
            if (!mat.r[i][8]) mat.r[i][8] = true;
            if (!mat.r[size - 1 - i][8]) mat.r[size - 1 - i][8] = true;
        }
        if (!mat.r[8][8]) mat.r[8][8] = true;
        return mat;
    }

    /* ===== Data Placement ===== */
    function placeData(mat, codewords) {
        var size = mat.m.length, bits = [];
        for (var i = 0; i < codewords.length; i++)
            for (var b = 7; b >= 0; b--) bits.push((codewords[i] >> b) & 1);
        var idx = 0, up = true;
        for (var col = size - 1; col >= 0; col -= 2) {
            if (col === 6) col--;
            for (var cnt = 0; cnt < size; cnt++) {
                var row = up ? (size - 1 - cnt) : cnt;
                for (var dc = 0; dc < 2; dc++) {
                    var c = col - dc;
                    if (c < 0 || mat.r[row][c]) continue;
                    mat.m[row][c] = idx < bits.length ? bits[idx++] : 0;
                }
            }
            up = !up;
        }
    }

    /* ===== Masking ===== */
    var MASKS = [
        function (r, c) { return (r + c) % 2 === 0; },
        function (r, c) { return r % 2 === 0; },
        function (r, c) { return c % 3 === 0; },
        function (r, c) { return (r + c) % 3 === 0; },
        function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
        function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; },
        function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
        function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
    ];

    function applyMask(mat, reserved, maskIdx) {
        var size = mat.length;
        for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) {
            if (!reserved[r][c] && MASKS[maskIdx](r, c)) mat[r][c] ^= 1;
        }
    }

    function penalty(mat) {
        var size = mat.length, score = 0;
        // Rule 1: runs
        for (var r = 0; r < size; r++) {
            var run = 1;
            for (var c = 1; c < size; c++) { if (mat[r][c] === mat[r][c - 1]) { run++; } else { if (run >= 5) score += run - 2; run = 1; } }
            if (run >= 5) score += run - 2;
        }
        for (var c = 0; c < size; c++) {
            var run = 1;
            for (var r = 1; r < size; r++) { if (mat[r][c] === mat[r - 1][c]) { run++; } else { if (run >= 5) score += run - 2; run = 1; } }
            if (run >= 5) score += run - 2;
        }
        // Rule 2: 2x2 blocks
        for (var r = 0; r < size - 1; r++) for (var c = 0; c < size - 1; c++) {
            var v = mat[r][c];
            if (v === mat[r][c + 1] && v === mat[r + 1][c] && v === mat[r + 1][c + 1]) score += 3;
        }
        // Rule 4: proportion
        var dark = 0;
        for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (mat[r][c]) dark++;
        var pct = (dark * 100) / (size * size);
        score += Math.abs(Math.floor(pct / 5) * 5 - 50) * 2;
        return score;
    }

    /* ===== Format Information ===== */
    function formatInfo(maskIdx) {
        var data = (1 << 3) | maskIdx; // EC Level L = 01
        var d = data << 10;
        for (var i = 4; i >= 0; i--) if (d & (1 << (i + 10))) d ^= 0x537 << i;
        var bits = ((data << 10) | d) ^ 0x5412;
        return bits;
    }

    function placeFormatInfo(mat, maskIdx) {
        var size = mat.length, info = formatInfo(maskIdx);
        // First copy positions (around top-left)
        var pos1 = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
        // Second copy positions
        var pos2 = [];
        for (var i = 0; i < 7; i++) pos2.push([size - 1 - i, 8]);
        for (var i = 0; i < 8; i++) pos2.push([8, size - 8 + i]);
        for (var i = 0; i < 15; i++) {
            var bit = (info >> i) & 1;
            mat[pos1[i][0]][pos1[i][1]] = bit;
            mat[pos2[i][0]][pos2[i][1]] = bit;
        }
    }

    /* ===== Main Generate Function ===== */
    function generate(text) {
        var ver = pickVersion(text.length);
        var codewords = encodeData(text, ver);
        var mat = buildMatrix(ver);
        placeData(mat, codewords);
        // Try all masks, pick best
        var bestMask = 0, bestScore = Infinity;
        for (var m = 0; m < 8; m++) {
            var copy = mat.m.map(function (row) { return row.slice(); });
            applyMask(copy, mat.r, m);
            placeFormatInfo(copy, m);
            var s = penalty(copy);
            if (s < bestScore) { bestScore = s; bestMask = m; }
        }
        applyMask(mat.m, mat.r, bestMask);
        placeFormatInfo(mat.m, bestMask);
        return mat.m;
    }

    /* ===== Canvas Renderer ===== */
    function renderToCanvas(canvas, matrix, opts) {
        opts = opts || {};
        var moduleSize = opts.moduleSize || 4;
        var padding = opts.padding || 4; // modules of quiet zone
        var computedColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        var darkColor = opts.darkColor || (computedColor ? computedColor : '#85bbff');
        var lightColor = opts.lightColor || 'transparent';
        var bgColor = opts.bgColor || 'transparent';
        var size = matrix.length;
        var totalModules = size + padding * 2;
        var px = totalModules * moduleSize;
        canvas.width = px;
        canvas.height = px;
        var ctx = canvas.getContext('2d');
        // Background
        if (bgColor !== 'transparent') { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, px, px); }
        else { ctx.clearRect(0, 0, px, px); }
        // Modules
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                var color = matrix[r][c] ? darkColor : lightColor;
                if (color !== 'transparent') {
                    ctx.fillStyle = color;
                    ctx.fillRect((c + padding) * moduleSize, (r + padding) * moduleSize, moduleSize, moduleSize);
                }
            }
        }
    }

    /* ===== Public API ===== */
    window.GiftCardQR = {
        render: function (text, canvasEl, options) {
            var matrix = generate(text);
            renderToCanvas(canvasEl, matrix, options);
        }
    };
})();
