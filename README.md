# 🧑‍🍳 KitchenCalc — Kitchen Inventory & Menu Calculator

Welcome to **KitchenCalc**! This application is designed to be the ultimate digital assistant for chefs, kitchen managers, and catering organizers. 

If you are new to programming, don't worry! This document (and the detailed guide inside the `docs/` folder) is written so that anyone can understand how this application works behind the scenes.

## 🌟 What does this app do?

KitchenCalc solves a massive headache in professional kitchens: **Math**.
When a chef says, *"We need to cook the 'Executive Lunch Menu' for 15 kids, 40 adults, and 10 seniors,"* calculating exactly how many packs of chicken, boxes of pasta, and bottles of sauce to order is a nightmare. 

KitchenCalc automates this by:
1. **Managing an Inventory (Catalog):** Keeping track of all ingredients, how they are packaged (e.g., 500g per pack), and how much stock you currently have.
2. **Creating Recipes:** Letting you build recipes and specify exactly how much of an ingredient goes to a Kid, an Adult, or a Senior.
3. **Building Menus:** Grouping several recipes together (e.g. Starter + Main Course + Dessert).
4. **The Magic Calculator:** When you select a Menu and tell it how many people are coming, it cross-references the recipes, looks at your ingredients, calculates a 10% safety margin, checks your current pantry stock, and tells you **exactly what you need to buy**.
5. **PDF Purchase Orders:** It generates a professional PDF order sheet that you can send directly to your suppliers!

## 🚀 Getting Started (How to run this app)

To run this app on your computer, you need a basic tool called **Node.js** installed. Once you have that, open your terminal (or command prompt) and follow these steps:

1. **Open the project folder** in your terminal.
2. **Install the dependencies**:
   ```bash
   npm install
   ```
   *(This downloads all the external building blocks we used to create the app, like React and icons).*
3. **Start the application**:
   ```bash
   npm run dev
   ```
4. **Open your browser** and go to the link it gives you (usually `http://localhost:5173`).

---

## 🏗️ The Technology Stack (What is this built with?)

This app is built using modern web development tools. Here is what they are and why we chose them:

* **React:** The main engine. It lets us build the "User Interface" (what you see) using reusable puzzle pieces called *Components* (like buttons or cards).
* **Vite:** The lightning-fast construction worker that bundles all our code together and serves it to your browser.
* **Tailwind CSS & Vanilla CSS:** The paint and decorations. We use CSS to make things look beautiful, colorful, and animated.
* **React Router:** The "Traffic Cop". It changes the pages on your screen (from Dashboard to Recipes to Menus) without ever making your browser refresh.
* **Zustand:** The "Global Brain". It holds all your saved data (your recipes, your menus) in one central place so every page can see it.

---

## 📚 Want to learn exactly how the code works?

If you want to understand *how* the code breathes and talks to itself, please open the **`docs/GUIDE.md`** file! 

It is written specifically for you, explaining the application's architecture (how data flows) using simple, everyday analogies.
