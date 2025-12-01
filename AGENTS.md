I want to design a vite canvas game for a 3yo child to learn their letters
The gameplay mechanic is that pictures are shown on the right hand side (apple)
And three flower heads are shown in a 1x3 column on the left hand side.  In the centre of each flower is a letter
You have to drag the pictures to the flowers.
When you get it correct, a bee appears and starts to draw a line using spirograph maths around the flower centre to draw a flower
To begin with, let's just get the game area set up. - the column with the three flowers, the game area on the right where the sprites (a_item_1 etc) are randomly distributed
Write a step-by-step implementation plan. Ensure that each step is small, self contained and verifiable. Think carefully about what feature to implement first to enable iterative building and verification at each step.
➜  bee_letters git:(main) tree
.
└── public
└── assets
├── flower
│   ├── flower_head_1.png
│   ├── flower_head_2.png
│   └── flower_head_3.png
└── items
├── a
├── a_item_1.png
├── a_item_2.png
├── a_item_3.png
├── a_item_6.png
└── a_item_7.png
There will be background music and some sound effects
This is a browser-based tower defense game built with:
Phaser 3 - JavaScript game framework for 2D games (handles rendering, physics, input, scenes)
Vite - Modern build tool and dev server
Vanilla JavaScript - ES6 modules, no framework like React
HTML5 Canvas - Rendered via Phaser
Hosting: Static files only, no backend required.