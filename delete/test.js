const canvas = document.getElementById('canv');
const ctx = canvas.getContext('2d');

var w = canvas.width = document.body.offsetWidth;
var h = canvas.height = document.body.offsetHeight;
var cols = Math.floor(w / 20) + 1;
var ypos = Array(cols).fill(0);

ctx.fillStyle = '#000';
ctx.fillRect(0, 0, w, h);

function refresh() {

    w = canvas.width = document.body.offsetWidth;
    h = canvas.height = document.body.offsetHeight;
    cols = Math.floor(w / 20) + 1;
    ypos = Array(cols).fill(0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
};

function matrix () {

  ctx.fillStyle = '#1111';
  ctx.fillRect(0, 0, w, h);
  
  ctx.fillStyle = '#3AB4F250';
  ctx.font = '20pt monospace';
  
  ypos.forEach((y, ind) => {
    const text = String.fromCharCode(Math.random() * 128);
    const x = ind * 20;
    ctx.fillText(text, x, y);
    if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
    else ypos[ind] = y + 20;
  });
}

setInterval(matrix, 50);

