# 🧠 The KitchenCalc Code Guide (For Beginners)

Welcome! If you are reading this, you want to understand how the KitchenCalc code actually works under the hood. We have written this document without complicated jargon so that anyone can follow along.

Imagine the KitchenCalc application like a highly organized **Restaurant**. We have a kitchen (the data server), waitstaff (the router), and tables (the screens you see).

---

## 1. The Global Brain: Zustand (`src/store/useStore.js`)

In React (the tool we used to build the app), data usually gets passed down from a parent component to a child component, like a bucket brigade. If a deep part of your app needs data, passing it through 10 layers of components is messy.

To solve this, we use a tool called **Zustand**. 
Think of Zustand as the **Central Office Whiteboard**. 

Instead of passing data from hand to hand, any part of the app can just "look" at the whiteboard to see the recipes, menus, and ingredients. 
* **State:** The data on the whiteboard (e.g., `ingredients: []`, `recipes: []`).
* **Actions:** The markers used to write on the whiteboard (e.g., `addRecipe`, `deleteIngredient`).

**The `persist` Magic:**
In `useStore.js`, you'll see a word called `persist`. This is incredibly important! It means that every time someone writes on the whiteboard, a photographer takes a picture and saves it to your hard drive (specifically, the browser's `localStorage`). If you close the tab and come back tomorrow, the app looks at the picture and redraws exactly what was on the whiteboard. You will never lose your data!

---

## 2. The Traffic Cop: React Router (`src/App.jsx`)

When you use the app, you see a sidebar on the left. When you click "Recipes", the screen changes to show recipes. When you click "Menus", it shows menus. 

How does it do this without reloading the web page? Using **React Router**.

React Router acts like a traffic cop. It reads the URL at the top of your browser.
* If the URL is `http://localhost:5173/dashboard`, it points the traffic to the **Dashboard** component.
* If the URL is `http://localhost:5173/recipes`, it points the traffic to the **Recipes** component.

**The `React.lazy()` Magic:**
In `App.jsx`, you will see something called `React.lazy()`. 
Imagine a restaurant menu that is 1,000 pages long. You wouldn't want to carry the whole thing if you just want dessert. `React.lazy()` tells the app: *"Don't download the code for the Calendar until the user actually clicks on the Calendar button."* This makes the app load instantly!

---

## 3. The Math Engine: How Requisitions are Calculated

The hardest part of the app is figuring out exactly how many packs of ingredients to buy. This logic lives inside `src/data/mockData.js` inside functions called `calcRequisition` and `calcMenuRequisition`.

Here is the plain English version of the math it does:

1. **Find the Base Amount:** It looks at a Recipe. It says, *"Okay, a Kid eats 100g of chicken, an Adult eats 200g, and a Senior eats 150g."*
2. **Multiply by People:** It multiplies those numbers by the amount of people coming. Let's say total demand is `5,000g` of chicken.
3. **Add the Safety Margin:** Kitchens are chaotic. Someone might drop a piece of chicken on the floor. The app automatically multiplies the demand by `1.10` (adding a 10% safety net). So now we need `5,500g`.
4. **Divide by Pack Size:** You can't buy loose grams of chicken; you buy it in boxes. Let's say chicken comes in a `2000g` box. The math is `5500 / 2000 = 2.75`.
5. **Round Up:** You can't buy `0.75` of a box. The app uses `Math.ceil()` to round up to the nearest whole number. You need **3 boxes**.
6. **Check the Fridge:** The app looks at your `currentStock`. If you already have 1 box in the fridge, it subtracts it. **Final Order: 2 boxes.**

---

## 4. The Directory Structure (Where is everything?)

If you open the `src/` folder, you will see a bunch of sub-folders. Here is what they do:

- 📁 `assets/` - Images, fonts, or external icons.
- 📁 `components/` - The Lego blocks. Small, reusable pieces like standard Buttons, Text Inputs, and the Sidebar. (e.g., `StarRating.jsx`).
- 📁 `constants/` - Things that never change. (e.g., `theme.js` holds the exact purple and teal colors we use everywhere).
- 📁 `data/` - Holds `mockData.js`, which contains the starter data and the complex math functions mentioned earlier.
- 📁 `hooks/` - Custom superpowers for the app (e.g., `useDeleteConfirm.js` allows buttons to say "Are you sure?" before deleting something).
- 📁 `store/` - Holds `useStore.js` (The Global Brain / Zustand).
- 📁 `views/` - The big screens. Every major "Page" has its own view (e.g., `DashboardView.jsx`).
- 📄 `index.css` - The global design rules. This makes sure hovers, borders, and animations are perfectly smooth.
- 📄 `main.jsx` - The very first file the computer reads. It hooks everything up to your screen.

---

## 5. Conclusion

By separating our concerns (Data lives in Zustand, Traffic is managed by the Router, UI lives in Components), the KitchenCalc app is incredibly stable. Even if you don't know how to code, understanding this structure helps you navigate the project easily!
