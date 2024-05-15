// Useful Interfaces

const Point = { 
    x: Number, 
    y: Number
}

const Quaternion = {
    w: Number,
    x: Number,
    y: Number,
    z: Number
}

const Particle = {
    prevPoit: Point,
    currPoint: Point,
    weight: Number
}

export { Point, Quaternion, Particle }