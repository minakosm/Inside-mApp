import * as math from "mathjs";
import { Navigation } from "./Navigation";

const mapInfo = {
    binaryMap: math.matrix([
        [1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,1 ,1 ,1 ,1 ,0 ,0 ,0 ,0 ,0 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1 ,0 ,0 ,1 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1 ,0 ,0 ,1 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,0 ,0 ,1 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1 ,0 ,0 ,1 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1 ,0 ,0 ,1 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,1],
        [1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1 ,1]
    ]),
    height : 20,
    width : 20,
    resolution : 1
}

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

    getPrevPoint = () =>  {
        return this.prevPoint;
    }

    getCurrPoint = () =>{
        return this.currPoint;
    }

    getHeading = () =>  {
        return this.heading;
    }

    getWeight = () => {
        return  this.weight
    }

    setPrevPoint = (x, y)  => {
        this.prevPoint.x = x;
        this.prevPoint.y = y;
    } 

    setCurrPoint = (x, y) => {
        this.currPoint.x = x;
        this.currPoint.y = y;
    }

    setHeading = (theta) => {
        this.heading = theta;
    }

    setWeight = (w) => {
        this.weight = w;
    }
 }
 
class OccupancyMap {
    constructor(){}

    nrOfParticles = 5;
    mapData = mapInfo.binaryMap;
    width = mapInfo.height;
    height = mapInfo.width;
    resolution = mapInfo.resolution;
    
    initializedPF = false;
    particles = [];

    userPos = {
        x: null,
        y: null,
    }

    // GETTERS - SETTERS
    getNrOfParticles = () => {return this.nrOfParticles;}
    setNrOfParticles = (nrOfParticles) => {this.nrOfParticles = nrOfParticles;}

    isPFInitialized = () => {return this.initializedPF;}

    clear = () => {
        this.mapData = null;
        this.width = 0;
        this.height = 0;
        this.resolution = null;

        this.initializedPF = false;
        this.particles = [];
    }

    initMap = (mapInfo) => {
        // let mapInfo = JSON.parse(mapPath);
        this.mapData = math.matrix(mapInfo.binaryMap);
        this.height = Number(mapInfo.height);
        this.width = Number(mapInfo.width);
        this.resolution = mapInfo.resolution;

        this.particles = new Array(this.nrOfParticles);

        this.initParticles();
    }

    // PARTICLE FILTER INITIALIZATION
    initParticles = () => {
        console.log(`INIT ${this.nrOfParticles} PARTICLES`)
        for( let i = 0 ; i<this.nrOfParticles; i++) {
            let p = new Particle() ;
            do {
                p.currPoint.x = p.prevPoint.x = math.random(0, this.width);
                p.currPoint.y = p.prevPoint.y = math.random(0, this.height);
                p.heading = math.random(-120, 120);
            } while (this.isInsideWall(p));

            p.weight = 1/this.nrOfParticles;
            this.particles[i] = JSON.parse(JSON.stringify(p));
        }

        console.log(`=========================================================== INIT PARTICLES ===========================================================`)
        this.particles.forEach((v, i) =>{
            console.log(`${i} PARTICLE ->   \t ${JSON.stringify(v)}`)
        })
        console.log(`=========================================================== INIT PARTICLES ===========================================================`)
        // this.userPos.x = this.particles.reduce((s, c) => {s + c.getCurrPoint().x * c.getWeight()}, 0);
        // this.userPos.y = this.particles.reduce((s, c) => {s + c.getCurrPoint().y * c.get.weight()}, 0);
        this.initializedPF = true;
    }    

    isOutOfBounds = (x, y) => {
        let outOfBoundsX = x < 0 || x > this.width;
        let outOfBoundsY = y < 0 || y > this.height;

        return (outOfBoundsX || outOfBoundsY);
    }

    isInsideWall = (particle) => {
        let xCell = math.floor(particle.currPoint.x);
        let yCell = math.floor(particle.currPoint.y);

        let OOB = this.isOutOfBounds(xCell, yCell);

        let res = OOB ? true : mapInfo.binaryMap.get([yCell, xCell]);
        return res;
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
        
        if(this.isOutOfBounds(currCell.x, currCell.y) || this.isInsideWall(particle)) {
            console.log(`WALL RETURN 0`)
            return {wallHit: true, nrOfPaths: 0};
        }
        console.log(`WALL DBG 1`)
        // if(math.norm([distance.x, distance.y])  <= 1) {
        //     console.log(`WALL RETURN 1`);
        //     return {wallHit: false, nrOfPaths: 1};
        // }

        console.log(`WALL DBG CRIT`)
        let yMin = prevCell.y === null ? currCell.y : math.min(currCell.y, prevCell.y);
        let yMax = prevCell.y === null ? currCell.y : math.max(currCell.y, prevCell.y);
        
        let xMin = prevCell.y === null ? currCell.x : math.min(currCell.x, prevCell.x);
        let xMax = prevCell.y === null ? currCell.x : math.max(currCell.x, prevCell.x);

        console.log(`Y ${yMin,  yMax}`);
        console.log(`X ${xMin,  xMax}`);
        let A = mapInfo.binaryMap.subset(math.index([
            math.range(yMin,  yMax, true), 
            math.range(xMin,  xMax, true)
        ]));

        console.log(`WALL DBG 2`)
        let [r, c] = A.size();
        
        let iStart = distance.y > 0 ? 0 : r-1;
        let jStart = distance.x > 0 ? 0 : c-1;

        let iEnd = distance.y > 0 ? r-1 : 0;
        let jEnd = distance.x > 0 ? c-1 : 0;

        let dirX = math.sign(distance.x);
        let dirY = math.sign(distance.y);

        A.set([iStart, jStart], 1);
        console.log(`WALL DBG 3`)
        for(let j = jStart + dirX; j != jEnd + dirX; j+=dirX)  {
            if(A.get([iStart,j]) === 0 ) {
                A.set([iStart,j], A.get([iStart, j-dirX]))
            } else {
                A.set([iStart,j], 0);
            }
        }
        console.log(`WALL DBG 4`)    
        for(i=iStart+dirY; i!=iEnd + dirY; i+=dirY) {
            if(A.get([i, jStart]) === 0) {
              A.set([i, jStart], A.get([i-dirY, jStart]))
            } else {
              A.set([i,jStart], 0);
            }
          }
        console.log(`WALL DBG 5`)
        for(let i=iStart+dirY; i!=iEnd+dirY; i+=dirY) {
            for(let j=jStart+dirX; j!=jEnd+dirY; i+=dirX) {
                if(A.get([i,j]) === 0) {
                    A.set([i,j], A.get([i-dirY,j]) + A.get([i,j-dirX]));
                } else {
                    A.set([i,j] = 0);
                }
            }
        }
        console.log(`WALL DBG 6`)
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
        console.log('BEFORE MOVE');
        console.log(`STEP LENGTH: ${stepLength}`);
        console.log(`YAW CHANGE: ${yawChange}`);
        this.moveParticles(stepLength, yawChange);

        console.log('BEFORE UPDATE');
        this.updateWeights();

        console.log(`AFTER UPDATE`)
        // Compute the Neff
        let N = this.nrOfParticles;
        let sumSq = this.particles.map(v => v.weight).reduce((p,c) => p + c*c, 0);

        let Neff = 1/sumSq;

        console.log(`Neff = ${Neff}`);
        if(Neff < N/2) {
            console.log(`BEFORE RESAMPLE`)
            let particleIndexes = this.systematicResample(this.particles);
            console.log(`AFTER RESAMPLE`);
            // Create Deep Copies of each Resampled Particle
            let newParticles = [];
            particleIndexes.forEach((v) => {
                let newP = JSON.parse(JSON.stringify(this.particles[v]));
                newParticles.push(newP);
            })
            // Create a Deep Copy of the particle array
            this.particles = JSON.parse(JSON.stringify(newParticles));

            // Normalize  Weights
            let wSum = this.particles.map(v => v.weight).reduce((p,c) => p + c,0);
            this.particles.map(v => v.weight/wSum).forEach((v, i) => this.particles[i].weight = v);

            console.log(`=========================================================== RESAMPLED PARTICLES ===========================================================`)
            this.particles.forEach((v,i) => {
                console.log(`PARTICLE ${i} ->  \t ${JSON.stringify(v)} `);
            })
            console.log(`=========================================================== RESAMPLED PARTICLES ===========================================================`)

        }
    }

    // PROPAGATE 
    moveParticles = (l, deltaTheta) => {
        console.log(`=========================================================== MOVE PARTICLES ===========================================================`)
        for(let i=0; i< this.nrOfParticles; i++) {
            // Create a Reference Copy of each Particle
            let p = this.particles[i];
            if (p.weight != 0)  {
                let dl = gaussianRandom(0, 0.2);
                let dth = gaussianRandom(0, 1);

                console.log(`dl = ${dl}     \t dth = ${dth}`)
                p.heading = p.heading + deltaTheta + dth;
                p.prevPoint.x = p.currPoint.x;
                p.prevPoint.y = p.currPoint.y;

                // WORLD COORDINATES (X LEFT, Y UP) -> MAP COORDINATES (X RIGHT, Y DOWN) 
                p.currPoint.x = p.currPoint.x + (l + dl) * (-math.sin(p.heading * math.pi/180));
                p.currPoint.y = p.currPoint.y + (l + dl) * (-math.cos(p.heading * math.pi/180))
            }           
        }
        
            this.particles.forEach((v, i) =>{
                console.log(`${i} PARTICLE ->   \t ${JSON.stringify(v)}`)
            })
        console.log(`=========================================================== MOVE PARTICLES ===========================================================`)
    }

    // UPDATE
    updateWeights = () => {
        console.log(`=========================================================== UPDATE PARTICLES ===========================================================`)

        let c = 0;
        for (let p of this.particles) {
            if(p.weight != 0){
                let inWall = this.isInsideWall(p);
                if(inWall) {
                    p.weight = 0;
                    p.currPoint.x = p.currPoint.y = 0;
                    p.prevPoint.x  = p.prevPoint.y = 0;
            }
        }
            console.log(`${c} PARTICLE \t ${JSON.stringify(p)}`);
            c = c+1;
        }
        console.log(`=========================================================== UPDATE PARTICLES ===========================================================`)
        // for(let i=0; i<this.nrOfParticles; i++){
        //     console.log(`UPDATING WEIGHT FOR ${i} PARTICLE `)
        //     // let {nrOfPaths, wallHit}  = this.wallPassCheck(this.particles[i]);
        //    // console.log( `NUMBER OF PATHS ->    ${nrOfPaths}\n WALLHIT ->   ${wallHit}` );
        //     if(this.isInsideWall(this.particles[i])) {
        //         console.log(`${i} PARTICLE HAS HIT WALL `);
        //         this.particles[i].setWeight(0);
        //         console.log(`${i} PARTICLE  -> \t   ${JSON.stringify(this.particles[i])}`);
        //     }
        //     // } else {
        //     //     // WEIGHT UPDATE FUNCTION 
        //     //     let [up, right, down, left] = this.distanceFromWalls(this.particles[i]);
                
        //     //     let minDist =  math.min(up, right, down, left);
        //     //     ///  //????????
        //     // }
        // }

        let wSum = this.particles.map(v => v.weight).reduce((p,c) => p + c,0);
        // Normalize  Weights
        this.particles.map(v => v.weight/wSum).forEach((v, i) => this.particles[i].weight = v);
        this.userPos.x = this.particles.reduce((s, c) => {s + c.currPoint.x * c.weight}, 0);
        this.userPos.y = this.particles.reduce((s, c) => {s + c.currPoint.y * c.weight}, 0);
    }

    // RESAMPLE
    systematicResample = (particleArray) => {
        let N = this.nrOfParticles;
        
        //cummulative sum of weights
        let cWeights = [];
        cWeights.push(particleArray[0].weight);

        for(let i=0; i<N-1; i++) {
            cWeights.push(cWeights[i] + particleArray[i+1].weight);
        }

        console.log(`CWEIGHTS = ${cWeights}`);

        //Starting Random Point [0, 1/N)
        let startingPoint = math.random(0, 1/N);
        console.log(`STARTING POINT = ${startingPoint}`)
        let resampledIndex = [];

        for(let i=0; i<N; i++) {
            let currentPoint = startingPoint + (1/N) * i;
            let s = 0;
            while(currentPoint > cWeights[s]) {
                s = s+1;
            }
            resampledIndex.push(s);
        }

        console.log(`INDEXES = ${resampledIndex}`);
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

export { Particle, OccupancyMap }
