Here is a step-by-step implementation plan to get the game area set up. This plan focuses on getting the visual layout correct before adding complex mechanics like drag-and-drop or the spirograph.

### Phase 1: Environment & Visual Layout

#### Step 1: Initialize Project & Basic Phaser Config ✅
**Goal:** Create a running Vite project with a blank Phaser canvas that resizes correctly for different screens (crucial for tablet/desktop play).
*   **Action:**
    *   Initialize `package.json` and install `phaser`.
    *   Create `index.html` and `main.js`.
    *   Configure Phaser to use `Phaser.AUTO`, set background color (e.g., sky blue), and use `Scale.FIT` to handle aspect ratios.
*   **Verification:** Run `npm run dev`. You should see a colored canvas filling the browser window without scrollbars.

#### Step 2: Create Scene Structure & Asset Preloader ✅
**Goal:** specific architecture for loading assets to prevent "black textures" later.
*   **Action:**
    *   Create two files: `src/scenes/Preloader.js` and `src/scenes/Game.js`.
    *   In `Preloader.js`, load the images provided in your file tree:
        *   `assets/flower/flower_head_[1-3].png`
        *   `assets/items/a/a_item_[1-7].png`
    *   Transition to `Game` scene upon complete.
*   **Verification:** Check the browser console network tab. Ensure all PNGs return status 200. The game should switch to the Game scene (blank for now).

#### Step 3: Define Layout Zones (Visual Debugging) ✅
**Goal:** mathematically divide the screen into the "Flower Zone" (Left) and "Play Zone" (Right).
*   **Action:**
    *   In `Game.js`, define a constant `SIDEBAR_WIDTH` (e.g., 25% of screen width).
    *   Draw a temporary debug line or semi-transparent rectangle to visualize the separation.
*   **Verification:** You see a line separating the left quarter of the screen from the right three-quarters.

#### Step 4: Render the Flower Column ✅
**Goal:** Display the three flowers in the left column, evenly spaced.
*   **Action:**
    *   Create a container or group for the flowers.
    *   Calculate Y-positions to place 3 flowers at 25%, 50%, and 75% of the screen height.
    *   Sprite logic: Pick a random `flower_head` image for each slot.
    *   Add a Phaser Text object in the exact center of each flower (hardcoded to "A", "B", "C" for now).
*   **Verification:** You see 3 flowers stacked vertically on the left, each with a letter in the center.

#### Step 5: Render Random Items on the Right ✅
**Goal:** Spawn the item sprites (`a_item_*`) in the right-hand game area without overlapping the flowers.
*   **Action:**
    *   Create a function `spawnItems()`.
    *   Loop through the loaded `a_item` images.
    *   Generate random X and Y coordinates.
        *   *Constraint X:* `SIDEBAR_WIDTH + padding` to `Screen Width - padding`.
        *   *Constraint Y:* `padding` to `Screen Height - padding`.
    *   Add the sprites to the scene.
*   **Verification:** The `a_item` images appear scattered on the right side of the screen. They do not appear on top of the flowers.

---

### Phase 2 (Future): Interaction & Mechanics
*Once Phase 1 is verified, we will move to:*
*   Step 6: Drag and Drop Implementation.
*   Step 7: Collision Logic (Flower vs Item).
*   Step 8: The Bee & Spirograph Logic.

### Getting Started

Shall we begin with **Step 1: Initialize Project & Basic Phaser Config**? I can provide the `main.js` and configuration code.