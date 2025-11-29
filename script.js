const MorphSVGPlugin = {
    pathDataToBezier: function(pathSelector) {
        const path = document.querySelector(pathSelector);
        if (!path) return [];
        const d = path.getAttribute('d');
        const match = d.match(/M([\d.]+),([\d.]+)c([\d.\-,\s]+)/);
        if (!match) return [];
        
        const [, startX, startY, coords] = match;
        const numbers = coords.split(/[,\s]+/).filter(n => n).map(Number);
        
        return [
            {x: parseFloat(startX), y: parseFloat(startY)},
            {x: parseFloat(startX) + numbers[0], y: parseFloat(startY) + numbers[1]},
            {x: parseFloat(startX) + numbers[2], y: parseFloat(startY) + numbers[3]},
            {x: parseFloat(startX) + numbers[4], y: parseFloat(startY) + numbers[5]}
        ];
    }
};

var svg = document.querySelector("svg");
var cursor = svg.createSVGPoint();
var arrows = document.querySelector(".arrows");
var randomAngle = 0;

var gameStats = {
    score: 0,
    shots: 0,
    startTime: Date.now(),
    lastAngle: 0,
    shotHistory: [], // Store each shot's details
    gameOver: false
};

var MAX_SHOTS = 10;
var TIME_LIMIT = 60; // seconds

// DOM elements for stats
var scoreEl = document.getElementById('score');
var shotsEl = document.getElementById('shots');
var angleEl = document.getElementById('angle');
var timerEl = document.getElementById('timer');

// Update timer every second
var timerInterval = setInterval(function() {
    if (gameStats.gameOver) return;
    
    var elapsed = Math.floor((Date.now() - gameStats.startTime) / 1000);
    var remaining = TIME_LIMIT - elapsed;
    
    if (remaining <= 0) {
        remaining = 0;
        endGame();
    }
    
    var minutes = Math.floor(remaining / 60);
    var seconds = remaining % 60;
    timerEl.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}, 1000);

document.getElementById('end-game-btn').addEventListener('click', endGame);

function endGame() {
    if (gameStats.gameOver) return;
    gameStats.gameOver = true;
    clearInterval(timerInterval);
    
    // Remove event listeners to prevent further shots
    window.removeEventListener("mousedown", draw);
    window.removeEventListener("mousemove", aim);
    window.removeEventListener("mouseup", loose);
    
    showSummary();
}

function showSummary() {
    var elapsed = Math.floor((Date.now() - gameStats.startTime) / 1000);
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;
    var timeStr = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    
    document.getElementById('final-score').textContent = gameStats.score;
    document.getElementById('final-shots').textContent = gameStats.shots;
    document.getElementById('final-time').textContent = timeStr;
    
    var avgScore = gameStats.shots > 0 ? (gameStats.score / gameStats.shots).toFixed(1) : '0.0';
    document.getElementById('avg-score').textContent = avgScore;
    
    var tbody = document.getElementById('shots-tbody');
    tbody.innerHTML = '';
    
    gameStats.shotHistory.forEach(function(shot, index) {
        var row = document.createElement('tr');
        var resultClass = shot.result.toLowerCase();
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${shot.angle}°</td>
            <td><strong>${shot.points}</strong></td>
            <td class="shot-result ${resultClass}">${shot.result}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('summary-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('summary-modal').classList.remove('show');
    clearInterval(timerInterval);
    gameStats = {
        score: 0,
        shots: 0,
        startTime: Date.now(),
        lastAngle: 0,
        shotHistory: [],
        gameOver: false
    };
    scoreEl.textContent = '0';
    shotsEl.textContent = '0/10';
    angleEl.textContent = '--';
    timerEl.textContent = '1:00';
    
    arrows.innerHTML = '';
    
    timerInterval = setInterval(function() {
        if (gameStats.gameOver) return;
        
        var elapsed = Math.floor((Date.now() - gameStats.startTime) / 1000);
        var remaining = TIME_LIMIT - elapsed;
        
        if (remaining <= 0) {
            remaining = 0;
            endGame();
        }
        
        var minutes = Math.floor(remaining / 60);
        var seconds = remaining % 60;
        timerEl.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }, 1000);
    
    window.addEventListener("mousedown", draw);
}

var target = {
    x: 900,
    y: 249.5
};

var lineSegment = {
    x1: 875,
    y1: 280,
    x2: 925,
    y2: 220
};

var pivot = {
    x: 100,
    y: 250
};

aim({
    clientX: 320,
    clientY: 300
});

window.addEventListener("mousedown", draw);

function draw(e) {
    if (gameStats.gameOver) return;
    
    randomAngle = (Math.random() * Math.PI * 0.03) - 0.015;
    TweenMax.to(".arrow-angle use", 0.3, {
        opacity: 1
    });
    window.addEventListener("mousemove", aim);
    window.addEventListener("mouseup", loose);
    aim(e);
}

function aim(e) {
    var point = getMouseSVG(e);
    point.x = Math.min(point.x, pivot.x - 7);
    point.y = Math.max(point.y, pivot.y + 7);
    var dx = point.x - pivot.x;
    var dy = point.y - pivot.y;
    var angle = Math.atan2(dy, dx) + randomAngle;
    var bowAngle = angle - Math.PI;
    
    gameStats.lastAngle = Math.round((bowAngle * 180 / Math.PI + 360) % 360);
    angleEl.textContent = gameStats.lastAngle + '°';
    
    var distance = Math.min(Math.sqrt((dx * dx) + (dy * dy)), 50);
    var scale = Math.min(Math.max(distance / 30, 1), 2);
    TweenMax.to("#bow", 0.3, {
        scaleX: scale,
        rotation: bowAngle + "rad",
        transformOrigin: "right center"
    });
    var arrowX = Math.min(pivot.x - ((1 / scale) * distance), 88);
    TweenMax.to(".arrow-angle", 0.3, {
        rotation: bowAngle + "rad",
        svgOrigin: "100 250"
    });
    TweenMax.to(".arrow-angle use", 0.3, {
        x: -distance
    });
    TweenMax.to("#bow polyline", 0.3, {
        attr: {
            points: "88,200 " + Math.min(pivot.x - ((1 / scale) * distance), 88) + ",250 88,300"
        }
    });

    var radius = distance * 9;
    var offset = {
        x: (Math.cos(bowAngle) * radius),
        y: (Math.sin(bowAngle) * radius)
    };
    var arcWidth = offset.x * 3;

    TweenMax.to("#arc", 0.3, {
        attr: {
            d: "M100,250c" + offset.x + "," + offset.y + "," + (arcWidth - offset.x) + "," + (offset.y + 50) + "," + arcWidth + ",50"
        },
        autoAlpha: distance/60
    });
}

var currentShotAngle = 0;

function loose() {
    currentShotAngle = gameStats.lastAngle;
    
    window.removeEventListener("mousemove", aim);
    window.removeEventListener("mouseup", loose);

    gameStats.shots++;
    shotsEl.textContent = gameStats.shots + '/10';
    
    if (gameStats.shots >= MAX_SHOTS) {
        setTimeout(endGame, 2500); 
    }

    TweenMax.to("#bow", 0.4, {
        scaleX: 1,
        transformOrigin: "right center",
        ease: Elastic.easeOut
    });
    TweenMax.to("#bow polyline", 0.4, {
        attr: {
            points: "88,200 88,250 88,300"
        },
        ease: Elastic.easeOut
    });
    var newArrow = document.createElementNS("http://www.w3.org/2000/svg", "use");
    newArrow.setAttributeNS('http://www.w3.org/1999/xlink', 'href', "#arrow");
    arrows.appendChild(newArrow);
    
    var path = MorphSVGPlugin.pathDataToBezier("#arc");
    TweenMax.to([newArrow], 0.5, {
        force3D: true,
        bezier: {
            type: "cubic",
            values: path,
            autoRotate: ["x", "y", "rotation"]
        },
        onUpdate: hitTest,
        onUpdateParams: ["{self}"],
        onComplete: onMiss,
        ease: Linear.easeNone
    });
    TweenMax.to("#arc", 0.3, {
        opacity: 0
    });
    //hide previous arrow
    TweenMax.set(".arrow-angle use", {
        opacity: 0
    });
}

function hitTest(tween) {
    var arrow = tween.target[0];
    if (!arrow._gsTransform) return;
    var transform = arrow._gsTransform;
    var radians = transform.rotation * Math.PI / 180;
    var arrowSegment = {
        x1: transform.x,
        y1: transform.y,
        x2: (Math.cos(radians) * 60) + transform.x,
        y2: (Math.sin(radians) * 60) + transform.y
    }

    var intersection = getIntersection(arrowSegment, lineSegment);
    if (intersection && intersection.segment1 && intersection.segment2) {
        tween.pause();
        var dx = intersection.x - target.x;
        var dy = intersection.y - target.y;
        var distance = Math.sqrt((dx * dx) + (dy * dy));
        var selector = ".hit";
        var points = 5;
        var result = "Hit";
        
        if (distance < 7) {
            selector = ".bullseye";
            points = 10;
            result = "Bullseye";
        }
        
        gameStats.score += points;
        scoreEl.textContent = gameStats.score;
        
        gameStats.shotHistory.push({
            angle: currentShotAngle,
            points: points,
            result: result
        });
        
        showMessage(selector);
    }
}

function onMiss() {
    gameStats.shotHistory.push({
        angle: currentShotAngle,
        points: 0,
        result: "Miss"
    });
    showMessage(".miss");
}

function showMessage(selector) {
    TweenMax.killTweensOf(selector);
    TweenMax.killChildTweensOf(selector);
    TweenMax.set(selector, {
        autoAlpha: 1
    });
    TweenMax.staggerFromTo(selector + " path", .5, {
        rotation: -5,
        scale: 0,
        transformOrigin: "center"
    }, {
        scale: 1,
        ease: Back.easeOut
    }, .05);
    TweenMax.staggerTo(selector + " path", .3, {
        delay: 2,
        rotation: 20,
        scale: 0,
        ease: Back.easeIn
    }, .03);
}

function getMouseSVG(e) {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    return cursor.matrixTransform(svg.getScreenCTM().inverse());
}

function getIntersection(segment1, segment2) {
    var dx1 = segment1.x2 - segment1.x1;
    var dy1 = segment1.y2 - segment1.y1;
    var dx2 = segment2.x2 - segment2.x1;
    var dy2 = segment2.y2 - segment2.y1;
    var cx = segment1.x1 - segment2.x1;
    var cy = segment1.y1 - segment2.y1;
    var denominator = dy2 * dx1 - dx2 * dy1;
    if (denominator == 0) {
        return null;
    }
    var ua = (dx2 * cy - dy2 * cx) / denominator;
    var ub = (dx1 * cy - dy1 * cx) / denominator;
    return {
        x: segment1.x1 + ua * dx1,
        y: segment1.y1 + ua * dy1,
        segment1: ua >= 0 && ua <= 1,
        segment2: ub >= 0 && ub <= 1
    };
}
