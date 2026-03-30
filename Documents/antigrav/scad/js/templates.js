/* ═══════════════════════════════════════════════════════
   SCAD Studio — Model Templates
   ═══════════════════════════════════════════════════════ */

export const TEMPLATES = [
  {
    name: 'Drilled Block',
    icon: '🧊',
    desc: 'A cube with cylindrical holes drilled through it — classic CSG demo.',
    code: `// Drilled Block
color([0.2, 0.6, 1.0])
difference() {
  cube(size = 6, center = true);
  cylinder(h = 8, r = 1.5, center = true);
  rotate([90, 0, 0])
    cylinder(h = 8, r = 1.5, center = true);
  rotate([0, 90, 0])
    cylinder(h = 8, r = 1.5, center = true);
}`,
  },
  {
    name: 'Trophy',
    icon: '🏆',
    desc: 'A simple award trophy with base, stem, and top sphere.',
    code: `// Trophy
// Base
color([0.15, 0.15, 0.2])
cylinder(h = 0.5, r = 2.5, center = false);

// Stem
color([0.85, 0.65, 0.13])
translate([0, 0, 0.5])
  cylinder(h = 3, r = 0.4, center = false);

// Cup
color([0.85, 0.65, 0.13])
translate([0, 0, 3.5])
  sphere(r = 1.2);

// Star on top
color([1.0, 0.95, 0.0])
translate([0, 0, 5.0])
  sphere(r = 0.4);`,
  },
  {
    name: 'Columns',
    icon: '🏛️',
    desc: 'Classical column arrangement with a platform.',
    code: `// Classical Columns
// Platform
color([0.85, 0.85, 0.8])
cube(size = [10, 10, 0.6], center = true);

// Columns (4 corners)
color([0.9, 0.88, 0.82])
translate([3.5, 3.5, 0.3])
  cylinder(h = 5, r = 0.5);
translate([-3.5, 3.5, 0.3])
  cylinder(h = 5, r = 0.5);
translate([3.5, -3.5, 0.3])
  cylinder(h = 5, r = 0.5);
translate([-3.5, -3.5, 0.3])
  cylinder(h = 5, r = 0.5);

// Roof
color([0.8, 0.78, 0.72])
translate([0, 0, 5.3])
  cube(size = [11, 11, 0.5], center = true);`,
  },
  {
    name: 'Snowman',
    icon: '⛄',
    desc: 'Three stacked spheres with a top hat.',
    code: `// Snowman
// Body
color([0.95, 0.95, 0.97])
sphere(r = 2);

// Middle
color([0.95, 0.95, 0.97])
translate([0, 0, 2.5])
  sphere(r = 1.5);

// Head
color([0.95, 0.95, 0.97])
translate([0, 0, 4.3])
  sphere(r = 1);

// Hat brim
color([0.1, 0.1, 0.12])
translate([0, 0, 5.1])
  cylinder(h = 0.2, r = 1.2);

// Hat top
color([0.1, 0.1, 0.12])
translate([0, 0, 5.3])
  cylinder(h = 1.2, r = 0.8);

// Nose
color([1.0, 0.5, 0.0])
translate([0, 1.0, 4.3])
  rotate([90, 0, 0])
    cylinder(h = 1.0, r = 0.15);`,
  },
  {
    name: 'Rocket',
    icon: '🚀',
    desc: 'A simple rocket ship with fins and a nose cone.',
    code: `// Rocket
// Body
color([0.8, 0.8, 0.85])
cylinder(h = 6, r = 1, center = false);

// Nose cone
color([1.0, 0.3, 0.2])
translate([0, 0, 6])
  cylinder(h = 2, r1 = 1, r2 = 0, center = false);

// Fins
color([0.2, 0.4, 0.9])
translate([1, 0, 0])
  cube(size = [0.2, 0.8, 2], center = true);

color([0.2, 0.4, 0.9])
translate([-1, 0, 0])
  cube(size = [0.2, 0.8, 2], center = true);

color([0.2, 0.4, 0.9])
translate([0, 1, 0])
  cube(size = [0.8, 0.2, 2], center = true);

color([0.2, 0.4, 0.9])
translate([0, -1, 0])
  cube(size = [0.8, 0.2, 2], center = true);

// Engine glow
color([1.0, 0.8, 0.0])
translate([0, 0, -0.3])
  sphere(r = 0.6);`,
  },
  {
    name: 'Pipe Joint',
    icon: '🔧',
    desc: 'Intersecting hollow pipes — a CSG intersection demo.',
    code: `// Pipe Joint
color([0.7, 0.2, 0.3])
difference() {
  union() {
    cylinder(h = 6, r = 1, center = true);
    rotate([90, 0, 0])
      cylinder(h = 6, r = 1, center = true);
  }
  union() {
    cylinder(h = 7, r = 0.7, center = true);
    rotate([90, 0, 0])
      cylinder(h = 7, r = 0.7, center = true);
  }
}`,
  },
  {
    name: 'Gear',
    icon: '⚙️',
    desc: 'A spur gear with parametric teeth using a for-loop.',
    code: `// Spur Gear
// Hub
color([0.6, 0.6, 0.65])
difference() {
  cylinder(h = 1.5, r = 3, center = true);
  cylinder(h = 2, r = 0.8, center = true);
}

// Teeth
color([0.5, 0.5, 0.55])
for (i = [0:30:330])
  rotate([0, 0, i])
    translate([3.2, 0, 0])
      cube(size = [0.8, 0.6, 1.5], center = true);`,
  },
  {
    name: 'Wall Bracket',
    icon: '📐',
    desc: 'An L-shaped wall mount bracket with mounting holes.',
    code: `// Wall Mount Bracket
color([0.3, 0.3, 0.35])
difference() {
  union() {
    // Vertical plate
    cube(size = [4, 0.4, 5], center = true);
    // Horizontal shelf
    translate([0, 1.3, -2.3])
      cube(size = [4, 3, 0.4], center = true);
    // Gusset
    translate([0, 0.3, -1.2])
      rotate([45, 0, 0])
        cube(size = [0.4, 2.5, 0.4], center = true);
  }
  // Mounting holes
  translate([1.2, 0, 1.5])
    rotate([90, 0, 0])
      cylinder(h = 1, r = 0.3, center = true);
  translate([-1.2, 0, 1.5])
    rotate([90, 0, 0])
      cylinder(h = 1, r = 0.3, center = true);
  translate([1.2, 0, -0.5])
    rotate([90, 0, 0])
      cylinder(h = 1, r = 0.3, center = true);
  translate([-1.2, 0, -0.5])
    rotate([90, 0, 0])
      cylinder(h = 1, r = 0.3, center = true);
}`,
  },
  {
    name: 'Box with Lid',
    icon: '📦',
    desc: 'A simple parametric enclosure box with a separate lid.',
    code: `// Box with Lid
// Box body
color([0.2, 0.5, 0.7])
difference() {
  cube(size = [6, 4, 3], center = true);
  translate([0, 0, 0.3])
    cube(size = [5.4, 3.4, 3], center = true);
}

// Lid (offset above)
color([0.25, 0.55, 0.75])
translate([0, 0, 3])
  difference() {
    cube(size = [6.2, 4.2, 0.4], center = true);
    translate([0, 0, -0.15])
      cube(size = [5.4, 3.4, 0.3], center = true);
  }`,
  },
  {
    name: 'Chess Pawn',
    icon: '♟️',
    desc: 'A chess pawn piece built from stacked primitives.',
    code: `// Chess Pawn
// Base
color([0.85, 0.82, 0.78])
cylinder(h = 0.6, r = 1.8);

// Base ring
color([0.8, 0.77, 0.73])
translate([0, 0, 0.6])
  cylinder(h = 0.3, r1 = 1.8, r2 = 1.4);

// Lower body taper
color([0.85, 0.82, 0.78])
translate([0, 0, 0.9])
  cylinder(h = 2.0, r1 = 1.2, r2 = 0.5);

// Neck ring
color([0.8, 0.77, 0.73])
translate([0, 0, 2.9])
  cylinder(h = 0.25, r = 0.55);

// Collar
color([0.85, 0.82, 0.78])
translate([0, 0, 3.15])
  cylinder(h = 0.3, r1 = 0.5, r2 = 0.65);

// Head
color([0.85, 0.82, 0.78])
translate([0, 0, 3.8])
  sphere(r = 0.7);`,
  },
  {
    name: 'Bearing Housing',
    icon: '🔩',
    desc: 'Concentric cylinders with bolt holes — a mechanical part.',
    code: `// Bearing Housing
color([0.4, 0.4, 0.45])
difference() {
  union() {
    // Outer flange
    cylinder(h = 1, r = 3, center = true);
    // Bore housing
    cylinder(h = 2.5, r = 1.8, center = true);
  }
  // Bore
  cylinder(h = 3, r = 1.2, center = true);
  // Mounting bolt holes
  translate([2.3, 0, 0])
    cylinder(h = 2, r = 0.3, center = true);
  translate([-2.3, 0, 0])
    cylinder(h = 2, r = 0.3, center = true);
  translate([0, 2.3, 0])
    cylinder(h = 2, r = 0.3, center = true);
  translate([0, -2.3, 0])
    cylinder(h = 2, r = 0.3, center = true);
}`,
  },
  {
    name: 'Honeycomb',
    icon: '🐝',
    desc: 'A hexagonal honeycomb grid pattern using nested for-loops.',
    code: `// Honeycomb Grid
color([0.95, 0.75, 0.1])
difference() {
  // Base plate
  cube(size = [12, 10, 0.6], center = true);

  // Hex holes (grid pattern)
  for (x = [-4:2.2:4])
    for (y = [-3:2.5:3])
      translate([x, y, 0])
        cylinder(h = 1, r = 0.9, center = true);
}`,
  },
];
