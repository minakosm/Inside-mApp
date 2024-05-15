import * as math from "mathjs";
import { Navigation } from "./Navigation";



class Particle {
    constructor() {
        this.prevPoint = {
            x: null,
            y: null,
        }
        this.currPoint = {
            x: null, 
            y: null,
        }
        this.heading = 0;
        this.weight = 0;
    }
 }
 
class OccupancyMap {
    nrOfParticles = 200;
    mapData = null;
    width = 0;
    height = 0;
    resolution = null;
    
    initializedPF =  false;
    particles = [];

    // GETTERS - SETTERS
    getNrOfParticles = () => {return this.nrOfParticles;}
    setNrOfParticles = (nrOfParticles) => {this.nrOfParticles = nrOfParticles;}

    isPFInitialized = () => {return this.initializedPF;}

    initMap = (mapInfo) => {
        // let mapInfo = JSON.parse(mapPath);
        this.mapData = mapInfo.binaryMap;
        this.height = mapInfo.height;
        this.width = mapInfo.width;
        this.resolution  = mapInfo.resolution;

        this.particles = new Array(this.nrOfParticles);
    }

    isOutOfBounds= (currentCell) => {
        let outOfBoundsX = currentCell.x < 0 || currentCell.x > this.width;
        let outOfBoundsY = currentCell.y < 0 || currentCell.y > this.height;

        return (outOfBoundsX || outOfBoundsY);
    }

    isInsideWall = (particle) => {
        let xCell = math.floor(particle.currPoint.x);
        let yCell = math.floor(particle.currPoint.y);

        return this.mapData.get([yCell, xCell]) === 1;
    }

    wallPassCheck = (particle) => {
        
        let prevCell = {
            x: math.floor(particle.prevPoint.x), 
            y: math.floor(particle.prevPoint.y)
        };

        let currCell = {
            x: math.floor(particle.currPoint.x),
            y: math.floor(particle.currPoint.y)
        };

        let distance = {
            x: currCell.x - prevCell.x,
            y: currCell.y - prevCell.y
        };

        if(this.isOutOfBounds(currCell) || this.isInsideWall(particle)) {return {wallHit: true, nrOfPaths: 0};}
        if(math.norm([distance.x, distance.y])  <= 1) {
            return {wallHit: false, nrOfPaths: 1};
        }

        let A = this.mapData.subset(math.index(
            math.range(math.min(currCell.y, prevCell.y),  math.max(currCell.y, prevCell.y), true), 
            math.range(math.min(currCell.x, prevCell.x),  math.max(currCell.x, prevCell.x), true)
        ));
        
        let [r, c] = A.size();
        let iStart = distance.y > 0 ? 0 : r-1;
        let jStart = distance.x > 0 ? 0 : c-1;

        let iEnd = distance.y > 0 ? r-1 : 0;
        let jEnd = distance.x > 0 ? c-1 : 0;

        let dirX = math.sign(distance.x);
        let dirY = math.sign(distance.y);

        A.set([iStart, jStart], 1);
        for(let j = jStart + dirX; j != jEnd + dirX; j+=dirX)  {
            if(A.get([iStart,j]) === 0 ) {
                A.set([iStart,j], A.get([iStart, j-dirX]))
            } else {
                A.set([iStart,j], 0);
            }
        }
            
        for(i=iStart+dirY; i!=iEnd + dirY; i+=dirY) {
            if(A.get([i, jStart]) === 0) {
              A.set([i, jStart], A.get([i-dirY, jStart]))
            } else {
              A.set([i,jStart], 0);
            }
          }

        for(let i=iStart+dirY; i!=iEnd+dirY; i+=dirY) {
            for(let j=jStart+dirX; j!=jEnd+dirY; i+=dirX) {
                if(A.get([i,j]) === 0) {
                    A.set([i,j], A.get([i-dirY,j]) + A.get([i,j-dirX]));
                } else {
                    A.set([i,j] = 0);
                }
            }
        }
        
        return {wallHit: A.get([iEnd, jEnd]) === 0, nrOfPaths: A.get([iEnd, jEnd])};
    }

    distanceFromWalls = (particle) => {
        let xCell = math.floor(particle.currPoint.x);
        let yCell = math.floor(particle.currPoint.y);

        // LOOK UP 
        let wallUp = 1;
        for(let i=yCell-1; i>=0; i--){
            if(this.mapData[xCell][i] === 1){
                break;
            } else {
                wallUp +=1;
            }
        }

        // LOOK DOWN 
        let wallDown = 1;
        for(let i=yCell+1; i<=this.height; i++) {
            if(this.mapData[xCell][i] === 1) {
                break;
            } else {
                wallDown += 1;
            }
        }

        // LOOK RIGHT
        let wallRight = 1;
        for(let i=xCell+1; i<=this.width; i++) {
            if(this.mapData[i][yCell] === 1) {
                break;
            } else {
                wallRight += 1;
            }
        }
        
        // LOOK LEFT
        let wallLeft = 1;
        for(let i=xCell-1; i>=0; i--) {
            if(this.mapData[i][yCell] === 1) {
                break;
            } else {
                wallLeft += 1;
            }
        }
        
        wallUp = wallUp - 1 + (particle.currPoint.y - yCell);
        wallDown = wallDown - (particle.currPoint.y - yCell);

        wallLeft = wallLeft - 1 + (particle.currPoint.x - xCell);
        wallRight = wallRight - (particle.currPoint.x - xCell);

        return [wallUp, wallRight, wallDown, wallLeft];
    }

    runParticleFilter = (stepLength, yawChange) => {
        if(!this.isPFInitialized()) {
            this.initParticles();
        }

        this.moveParticles(stepLength, yawChange);

        this.updateWeights();

        // Compute the Neff
        let N = this.nrOfParticles;
        let sumSq = this.particles.map(v => v.weight).reduce((p,c) => p + c*c, 0);

        let Neff = 1/sumSq;
        if(Neff < N/3) {
            let particleIndexes = this.systematicResample(this.particles);
            
            this.particles = math.subset(this.particles, math.index(particleIndexes));
        }
    }

    // PARTICLE FILTER INITIALIZATION
    initParticles = () => {
        for( let i = 0 ; i<this.nrOfParticles; i++) {
            let p = new Particle() ;
            do {
                p.currPoint.x = math.random(0, this.width);
                p.currPoint.y = math.random(0, this.height);
                p.heading = math.random(-180, 180);
            } while (!this.isInsideWall(p));
            p.weight = 1/this.nrOfParticles;
            this.particles[i] = p;
        }
        this.initializedPF = true;
    }

    // PROPAGATE 
    moveParticles = (l, deltaTheta) => {
        for(let i=0; i< this.particles.length; i++) {
            let dl = gaussianRandom(0, 0.2);
            let dth = gaussianRandom(0, 1);
            this.particles[i].heading = Navigation.quaternion2rpy(Navigation.rpy2quaternion(0, 0, this.particles[i].heading + deltaTheta + dth))[2];
            this.particles[i].prevPoint = this.particles[i].currPoint;

            // WORLD COORDINATES (X LEFT, Y UP) -> MAP COORDINATES (X RIGHT, Y DOWN) 
            this.particles[i].currPoint.x += (l + dl) * math.cos(this.particles[i].heading + math.pi/2);
            this.particles[i].currPoint.y += (l + dl) * math.sin(this.particles[i].heading + math.pi/2);
        }
    }

    // UPDATE
    updateWeights = () => {
        for(let i=0; i<this.particles.length; i++){
            let {nrOfPaths, wallHit}  = this.wallPassCheck(this.particles[i]);
            if(wallHit) {
                this.particles[i].weight = 0;
            } else {
                // WEIGHT UPDATE FUNCTION 
                let [up, right, down, left] = this.distanceFromWalls(this.particles[i]);
                
                let minDist =  math.min(up, right, down, left);
                ///  //????????
            }
        }

        let wSum = this.particles.map(v => v.weight).reduce((p,c) => p + c,0);
        // Normalize  Weights
        this.particles.map(v => v.weight/wSum).forEach((v, i) => arr[i].weight = v);

    }

    // RESAMPLE
    systematicResample = (particleArray) => {
        let N = particleArray.length();
        
        //cummulative sum of weights
        let cWeights = [];
        cWeights.push(particleArray[0].weight);

        for(let i=0; i<N-1; i++) {
            cWeights.push(cWeights[i] + particleArray[i+1].weight);
        }

        //Starting Random Point [0, 1/N)
        let startingPoint = math.random(0, 1/N);
        let resampledIndex = [];

        for(let i=0; i<N; i++) {
            let currentPoint = startingPoint + (1/N) * i;
            let s = 0;
            while(currentPoint < cWeights[i]) {
                s = s+1;
            }
            resampledIndex.push(s);
        }

        return resampledIndex;
    }

}

// Using Box-Muller transform to generate a random number drawn from a normal ditstribution
const gaussianRandom = (m, std) => {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

    return z * std + m;
}

class ParticleFilter {

    // FIRST ASSUMPTION :  WE ONLY WALK IN STRAIGHT LINES 
    propagate(particles, l, theta) {
        for(let i=0; i<particles.length; i++) {
            let p = particles[i];
            let dl = gaussianRandom(0, 0.2);
            let dth = gaussianRandom(0, 1);
            p.prevPoint = p.currPoint;
            p.currPoint.x += (l + dl) * math.cos(p.heading + dth + math.pi/2);
            p.currPoint.y += (l + dl) * math.sin(p.heading + dth + math.pi/2);
        }
    }

    update(particles, ocMap) {
        // Update Weights in a way to be more likely to walk in the center of a corridor. (not room center)
        let wSum = 0;
        for(let i=0; i< particles.length; i++) {
            if(ocMap.wallPassCheck(particles[i])) {
                particles[i].weight = 0;
            } else {
                // WEIGHT FUNCTION (MAYBE WALL-LENGTH BASED)     
                    
                wSum += particles[i].weight;
            }
        }

        particles.forEach(e => {
            e.x = e.x / wSum;
        });
        particles.sort(function (a,b) { return b.weight - a.weight });
        particles = particles.filter(function (p) { return p.weight > 0 });
        
    }

    resample(particles) {
        let wSquareSum = 0;
        let N = particles.length;
        for(let i=0; i<N; i++)  {
            wSquareSum += particles[i].weight ** 2;
        }   

        let nEff = 1/wSquareSum;
        if(nEff >= N/2)  { 
            return particles; 
        } else {
            // RESAMPLE FUNCTION
        }
    }

    run() {
        if(!this.initialized) this.init() ;

        this.propagate();
        this.update();

        this.resample();
    }
}

export { ParticleFilter, OccupancyMap }
