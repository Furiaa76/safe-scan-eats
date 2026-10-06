// Practical base shopping lists. Quantities are approximate; check packaged-food labels.
export type CatalogIngredient = { name: string; quantity: string; glutenSwap?: string; lactoseSwap?: string };
export type CatalogRecipe = { id: string; title: string; englishTitle: string; aliases: string[]; servings: number; ingredients: CatalogIngredient[] };
export const EXTRA_RECIPES: CatalogRecipe[] = [
  {
    "id": "cannelloni-di-carne",
    "title": "Cannelloni di carne",
    "englishTitle": "Meat cannelloni",
    "aliases": [
      "Meat cannelloni",
      "cannelloni",
      "cannelloni al ragù",
      "cannelloni al ragu"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cannelloni",
        "quantity": "250 g",
        "glutenSwap": "Cannelloni senza glutine"
      },
      {
        "name": "Carne macinata",
        "quantity": "400 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Besciamella",
        "quantity": "500 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cannelloni-ricotta-e-spinaci",
    "title": "Cannelloni ricotta e spinaci",
    "englishTitle": "Ricotta and spinach cannelloni",
    "aliases": [
      "Ricotta and spinach cannelloni",
      "cannelloni agli spinaci",
      "cannelloni di ricotta e spinaci",
      "spinach cannelloni"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cannelloni",
        "quantity": "250 g",
        "glutenSwap": "Cannelloni senza glutine"
      },
      {
        "name": "Ricotta",
        "quantity": "400 g",
        "lactoseSwap": "Ricotta senza lattosio"
      },
      {
        "name": "Spinaci",
        "quantity": "500 g"
      },
      {
        "name": "Besciamella",
        "quantity": "500 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Noce moscata",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "lasagne-vegetariane",
    "title": "Lasagne vegetariane",
    "englishTitle": "Vegetarian lasagna",
    "aliases": [
      "Vegetarian lasagna",
      "lasagne alle verdure",
      "vegetable lasagna"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Sfoglia per lasagne",
        "quantity": "250 g",
        "glutenSwap": "Sfoglia per lasagne senza glutine"
      },
      {
        "name": "Zucchine",
        "quantity": "400 g"
      },
      {
        "name": "Carote",
        "quantity": "200 g"
      },
      {
        "name": "Funghi",
        "quantity": "200 g"
      },
      {
        "name": "Besciamella",
        "quantity": "500 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "lasagne-al-pesto",
    "title": "Lasagne al pesto",
    "englishTitle": "Pesto lasagna",
    "aliases": [
      "Pesto lasagna"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Sfoglia per lasagne",
        "quantity": "250 g",
        "glutenSwap": "Sfoglia per lasagne senza glutine"
      },
      {
        "name": "Basilico",
        "quantity": "60 g"
      },
      {
        "name": "Pinoli",
        "quantity": "30 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "80 ml"
      },
      {
        "name": "Besciamella",
        "quantity": "500 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "100 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-pomodoro",
    "title": "Pasta al pomodoro",
    "englishTitle": "Pasta with tomato sauce",
    "aliases": [
      "Pasta with tomato sauce",
      "pasta al sugo",
      "spaghetti al pomodoro"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-rag",
    "title": "Pasta al ragù",
    "englishTitle": "Pasta bolognese",
    "aliases": [
      "Pasta bolognese",
      "pasta al ragu",
      "ragù alla bolognese",
      "ragu alla bolognese",
      "tagliatelle al ragù",
      "spaghetti bolognese"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Carne macinata",
        "quantity": "400 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "amatriciana",
    "title": "Amatriciana",
    "englishTitle": "Amatriciana",
    "aliases": [
      "Amatriciana",
      "pasta all amatriciana",
      "bucatini all amatriciana"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Bucatini",
        "quantity": "320 g",
        "glutenSwap": "Bucatini senza glutine"
      },
      {
        "name": "Guanciale",
        "quantity": "150 g"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Pecorino romano",
        "quantity": "80 g"
      },
      {
        "name": "Peperoncino",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "gricia",
    "title": "Gricia",
    "englishTitle": "Gricia",
    "aliases": [
      "Gricia",
      "pasta alla gricia"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Guanciale",
        "quantity": "180 g"
      },
      {
        "name": "Pecorino romano",
        "quantity": "100 g"
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-pesto",
    "title": "Pasta al pesto",
    "englishTitle": "Pasta with pesto",
    "aliases": [
      "Pasta with pesto",
      "pesto alla genovese",
      "pesto pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Basilico",
        "quantity": "60 g"
      },
      {
        "name": "Pinoli",
        "quantity": "30 g"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "80 ml"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-alla-puttanesca",
    "title": "Pasta alla puttanesca",
    "englishTitle": "Puttanesca",
    "aliases": [
      "Puttanesca",
      "spaghetti alla puttanesca"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Spaghetti",
        "quantity": "320 g",
        "glutenSwap": "Spaghetti senza glutine"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Olive nere",
        "quantity": "100 g"
      },
      {
        "name": "Capperi",
        "quantity": "30 g"
      },
      {
        "name": "Acciughe",
        "quantity": "30 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-all-arrabbiata",
    "title": "Pasta all'arrabbiata",
    "englishTitle": "Arrabbiata",
    "aliases": [
      "Arrabbiata",
      "penne all arrabbiata",
      "pasta arrabbiata"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Penne",
        "quantity": "320 g",
        "glutenSwap": "Penne senza glutine"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Peperoncino",
        "quantity": "q.b."
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-tonno",
    "title": "Pasta al tonno",
    "englishTitle": "Tuna pasta",
    "aliases": [
      "Tuna pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Tonno",
        "quantity": "200 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "400 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-salmone",
    "title": "Pasta al salmone",
    "englishTitle": "Salmon pasta",
    "aliases": [
      "Salmon pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Salmone",
        "quantity": "250 g"
      },
      {
        "name": "Panna",
        "quantity": "200 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-ai-quattro-formaggi",
    "title": "Pasta ai quattro formaggi",
    "englishTitle": "Four cheese pasta",
    "aliases": [
      "Four cheese pasta",
      "pasta quattro formaggi"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Gorgonzola",
        "quantity": "100 g",
        "lactoseSwap": "Gorgonzola senza lattosio"
      },
      {
        "name": "Fontina",
        "quantity": "100 g",
        "lactoseSwap": "Fontina senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Taleggio",
        "quantity": "100 g",
        "lactoseSwap": "Taleggio senza lattosio"
      },
      {
        "name": "Latte",
        "quantity": "100 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "spaghetti-alle-vongole",
    "title": "Spaghetti alle vongole",
    "englishTitle": "Spaghetti with clams",
    "aliases": [
      "Spaghetti with clams",
      "pasta alle vongole"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Spaghetti",
        "quantity": "320 g",
        "glutenSwap": "Spaghetti senza glutine"
      },
      {
        "name": "Vongole",
        "quantity": "1000 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-zucchine-e-gamberetti",
    "title": "Pasta zucchine e gamberetti",
    "englishTitle": "Zucchini and shrimp pasta",
    "aliases": [
      "Zucchini and shrimp pasta",
      "pasta gamberi e zucchine"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Zucchine",
        "quantity": "300 g"
      },
      {
        "name": "Gamberetti",
        "quantity": "300 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-e-fagioli",
    "title": "Pasta e fagioli",
    "englishTitle": "Pasta and beans",
    "aliases": [
      "Pasta and beans"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta corta",
        "quantity": "200 g",
        "glutenSwap": "Pasta corta senza glutine"
      },
      {
        "name": "Fagioli cotti",
        "quantity": "500 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "200 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-e-ceci",
    "title": "Pasta e ceci",
    "englishTitle": "Pasta and chickpeas",
    "aliases": [
      "Pasta and chickpeas"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta corta",
        "quantity": "200 g",
        "glutenSwap": "Pasta corta senza glutine"
      },
      {
        "name": "Ceci cotti",
        "quantity": "500 g"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "150 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-forno",
    "title": "Pasta al forno",
    "englishTitle": "Baked pasta",
    "aliases": [
      "Baked pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Carne macinata",
        "quantity": "300 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "250 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-fredda",
    "title": "Pasta fredda",
    "englishTitle": "Pasta salad",
    "aliases": [
      "Pasta salad",
      "insalata di pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Pomodorini",
        "quantity": "300 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "200 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Olive",
        "quantity": "80 g"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "gnocchi-al-pomodoro",
    "title": "Gnocchi al pomodoro",
    "englishTitle": "Gnocchi with tomato sauce",
    "aliases": [
      "Gnocchi with tomato sauce"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Gnocchi di patate",
        "quantity": "800 g",
        "glutenSwap": "Gnocchi di patate senza glutine"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "gnocchi-alla-sorrentina",
    "title": "Gnocchi alla sorrentina",
    "englishTitle": "Sorrentina gnocchi",
    "aliases": [
      "Sorrentina gnocchi"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Gnocchi di patate",
        "quantity": "800 g",
        "glutenSwap": "Gnocchi di patate senza glutine"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "250 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "ravioli-ricotta-e-spinaci",
    "title": "Ravioli ricotta e spinaci",
    "englishTitle": "Ricotta and spinach ravioli",
    "aliases": [
      "Ricotta and spinach ravioli",
      "ravioli agli spinaci"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "400 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "4"
      },
      {
        "name": "Ricotta",
        "quantity": "300 g",
        "lactoseSwap": "Ricotta senza lattosio"
      },
      {
        "name": "Spinaci",
        "quantity": "400 g"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Burro",
        "quantity": "80 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Salvia",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "tortellini-in-brodo",
    "title": "Tortellini in brodo",
    "englishTitle": "Tortellini in broth",
    "aliases": [
      "Tortellini in broth"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Tortellini",
        "quantity": "500 g",
        "glutenSwap": "Tortellini senza glutine"
      },
      {
        "name": "Brodo di carne",
        "quantity": "1500 ml"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      }
    ]
  },
  {
    "id": "risotto-alla-milanese",
    "title": "Risotto alla milanese",
    "englishTitle": "Milanese risotto",
    "aliases": [
      "Milanese risotto",
      "risotto allo zafferano",
      "saffron risotto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Zafferano",
        "quantity": "1 bustina"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Burro",
        "quantity": "60 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "risotto-ai-funghi",
    "title": "Risotto ai funghi",
    "englishTitle": "Mushroom risotto",
    "aliases": [
      "Mushroom risotto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Funghi",
        "quantity": "400 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "risotto-alla-zucca",
    "title": "Risotto alla zucca",
    "englishTitle": "Pumpkin risotto",
    "aliases": [
      "Pumpkin risotto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Zucca",
        "quantity": "500 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "risotto-agli-asparagi",
    "title": "Risotto agli asparagi",
    "englishTitle": "Asparagus risotto",
    "aliases": [
      "Asparagus risotto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Asparagi",
        "quantity": "400 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "risotto-ai-frutti-di-mare",
    "title": "Risotto ai frutti di mare",
    "englishTitle": "Seafood risotto",
    "aliases": [
      "Seafood risotto",
      "risotto alla pescatora"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Cozze",
        "quantity": "500 g"
      },
      {
        "name": "Vongole",
        "quantity": "500 g"
      },
      {
        "name": "Gamberetti",
        "quantity": "200 g"
      },
      {
        "name": "Calamari",
        "quantity": "200 g"
      },
      {
        "name": "Brodo di pesce",
        "quantity": "1000 ml"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "insalata-di-riso",
    "title": "Insalata di riso",
    "englishTitle": "Rice salad",
    "aliases": [
      "Rice salad"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso",
        "quantity": "320 g"
      },
      {
        "name": "Tonno",
        "quantity": "200 g"
      },
      {
        "name": "Mais",
        "quantity": "150 g"
      },
      {
        "name": "Piselli",
        "quantity": "150 g"
      },
      {
        "name": "Pomodorini",
        "quantity": "200 g"
      },
      {
        "name": "Olive",
        "quantity": "80 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polenta",
    "title": "Polenta",
    "englishTitle": "Polenta",
    "aliases": [
      "Polenta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina di mais",
        "quantity": "350 g"
      },
      {
        "name": "Acqua",
        "quantity": "1400 ml"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polenta-e-funghi",
    "title": "Polenta e funghi",
    "englishTitle": "Polenta with mushrooms",
    "aliases": [
      "Polenta with mushrooms"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina di mais",
        "quantity": "350 g"
      },
      {
        "name": "Acqua",
        "quantity": "1400 ml"
      },
      {
        "name": "Funghi",
        "quantity": "500 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "minestrone",
    "title": "Minestrone",
    "englishTitle": "Minestrone",
    "aliases": [
      "Minestrone",
      "minestrone di verdure"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Patate",
        "quantity": "300 g"
      },
      {
        "name": "Carote",
        "quantity": "200 g"
      },
      {
        "name": "Zucchine",
        "quantity": "300 g"
      },
      {
        "name": "Fagioli cotti",
        "quantity": "300 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "2 coste"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "200 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "vellutata-di-zucca",
    "title": "Vellutata di zucca",
    "englishTitle": "Pumpkin soup",
    "aliases": [
      "Pumpkin soup",
      "crema di zucca"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Zucca",
        "quantity": "800 g"
      },
      {
        "name": "Patate",
        "quantity": "300 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "800 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "zuppa-di-lenticchie",
    "title": "Zuppa di lenticchie",
    "englishTitle": "Lentil soup",
    "aliases": [
      "Lentil soup"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Lenticchie secche",
        "quantity": "300 g"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "200 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "ribollita",
    "title": "Ribollita",
    "englishTitle": "Ribollita",
    "aliases": [
      "Ribollita"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cavolo nero",
        "quantity": "400 g"
      },
      {
        "name": "Fagioli cotti",
        "quantity": "400 g"
      },
      {
        "name": "Pane",
        "quantity": "250 g",
        "glutenSwap": "Pane senza glutine"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "200 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pizza-marinara",
    "title": "Pizza marinara",
    "englishTitle": "Marinara pizza",
    "aliases": [
      "Marinara pizza"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "500 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Acqua",
        "quantity": "300 ml"
      },
      {
        "name": "Lievito di birra",
        "quantity": "7 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "300 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Origano",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "10 g"
      }
    ]
  },
  {
    "id": "focaccia",
    "title": "Focaccia",
    "englishTitle": "Focaccia",
    "aliases": [
      "Focaccia",
      "focaccia genovese"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "500 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Acqua",
        "quantity": "320 ml"
      },
      {
        "name": "Lievito di birra",
        "quantity": "7 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "80 ml"
      },
      {
        "name": "Sale",
        "quantity": "10 g"
      }
    ]
  },
  {
    "id": "piadina",
    "title": "Piadina",
    "englishTitle": "Piadina",
    "aliases": [
      "Piadina",
      "piadine"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "500 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Acqua",
        "quantity": "250 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "80 ml"
      },
      {
        "name": "Sale",
        "quantity": "8 g"
      }
    ]
  },
  {
    "id": "bruschette-al-pomodoro",
    "title": "Bruschette al pomodoro",
    "englishTitle": "Tomato bruschetta",
    "aliases": [
      "Tomato bruschetta",
      "bruschetta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pane",
        "quantity": "300 g",
        "glutenSwap": "Pane senza glutine"
      },
      {
        "name": "Pomodori",
        "quantity": "400 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polpette-al-sugo",
    "title": "Polpette al sugo",
    "englishTitle": "Meatballs in tomato sauce",
    "aliases": [
      "Meatballs in tomato sauce",
      "polpette",
      "meatballs"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne macinata",
        "quantity": "500 g"
      },
      {
        "name": "Uova",
        "quantity": "1"
      },
      {
        "name": "Pangrattato",
        "quantity": "80 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polpette-di-zucchine",
    "title": "Polpette di zucchine",
    "englishTitle": "Zucchini patties",
    "aliases": [
      "Zucchini patties"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Zucchine",
        "quantity": "600 g"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Pangrattato",
        "quantity": "100 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polpettone",
    "title": "Polpettone",
    "englishTitle": "Meatloaf",
    "aliases": [
      "Meatloaf"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne macinata",
        "quantity": "700 g"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Pangrattato",
        "quantity": "100 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Latte",
        "quantity": "100 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cotoletta-alla-milanese",
    "title": "Cotoletta alla milanese",
    "englishTitle": "Milanese cutlet",
    "aliases": [
      "Milanese cutlet",
      "cotoletta",
      "cotolette"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Fettine di vitello",
        "quantity": "600 g"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Pangrattato",
        "quantity": "150 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Burro",
        "quantity": "120 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "scaloppine-al-limone",
    "title": "Scaloppine al limone",
    "englishTitle": "Lemon escalopes",
    "aliases": [
      "Lemon escalopes",
      "scaloppine"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Fettine di vitello",
        "quantity": "600 g"
      },
      {
        "name": "Farina",
        "quantity": "60 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Limone",
        "quantity": "2"
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "saltimbocca-alla-romana",
    "title": "Saltimbocca alla romana",
    "englishTitle": "Saltimbocca",
    "aliases": [
      "Saltimbocca"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Fettine di vitello",
        "quantity": "600 g"
      },
      {
        "name": "Prosciutto crudo",
        "quantity": "100 g"
      },
      {
        "name": "Salvia",
        "quantity": "q.b."
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Vino bianco",
        "quantity": "100 ml"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "spezzatino-con-patate",
    "title": "Spezzatino con patate",
    "englishTitle": "Beef and potato stew",
    "aliases": [
      "Beef and potato stew",
      "spezzatino"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne di manzo",
        "quantity": "700 g"
      },
      {
        "name": "Patate",
        "quantity": "600 g"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "300 g"
      },
      {
        "name": "Brodo di carne",
        "quantity": "500 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "ossobuco",
    "title": "Ossobuco",
    "englishTitle": "Ossobuco",
    "aliases": [
      "Ossobuco",
      "ossobuchi"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Ossobuchi di vitello",
        "quantity": "4"
      },
      {
        "name": "Farina",
        "quantity": "50 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Brodo di carne",
        "quantity": "500 ml"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "brasato",
    "title": "Brasato",
    "englishTitle": "Braised beef",
    "aliases": [
      "Braised beef",
      "brasato al vino rosso"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne di manzo",
        "quantity": "800 g"
      },
      {
        "name": "Vino rosso",
        "quantity": "500 ml"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "2 coste"
      },
      {
        "name": "Alloro",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "arrosto-di-vitello",
    "title": "Arrosto di vitello",
    "englishTitle": "Roast veal",
    "aliases": [
      "Roast veal",
      "arrosto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne di vitello",
        "quantity": "800 g"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Brodo di carne",
        "quantity": "300 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pollo-al-forno-con-patate",
    "title": "Pollo al forno con patate",
    "englishTitle": "Roast chicken with potatoes",
    "aliases": [
      "Roast chicken with potatoes",
      "pollo arrosto",
      "roast chicken"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pollo",
        "quantity": "1000 g"
      },
      {
        "name": "Patate",
        "quantity": "800 g"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pollo-alla-cacciatora",
    "title": "Pollo alla cacciatora",
    "englishTitle": "Chicken cacciatore",
    "aliases": [
      "Chicken cacciatore"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pollo",
        "quantity": "1000 g"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Olive",
        "quantity": "100 g"
      },
      {
        "name": "Vino rosso",
        "quantity": "100 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pollo-al-curry",
    "title": "Pollo al curry",
    "englishTitle": "Chicken curry",
    "aliases": [
      "Chicken curry"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Petto di pollo",
        "quantity": "600 g"
      },
      {
        "name": "Latte di cocco",
        "quantity": "400 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Curry",
        "quantity": "2 cucchiaini"
      },
      {
        "name": "Riso",
        "quantity": "280 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pollo-alle-mandorle",
    "title": "Pollo alle mandorle",
    "englishTitle": "Almond chicken",
    "aliases": [
      "Almond chicken"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Petto di pollo",
        "quantity": "600 g"
      },
      {
        "name": "Mandorle",
        "quantity": "100 g"
      },
      {
        "name": "Salsa di soia",
        "quantity": "50 ml",
        "glutenSwap": "Salsa di soia senza glutine"
      },
      {
        "name": "Zenzero",
        "quantity": "q.b."
      },
      {
        "name": "Amido di mais",
        "quantity": "30 g"
      },
      {
        "name": "Olio di semi",
        "quantity": "2 cucchiai"
      }
    ]
  },
  {
    "id": "frittata",
    "title": "Frittata",
    "englishTitle": "Omelette",
    "aliases": [
      "Omelette",
      "omelet",
      "frittata semplice"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Uova",
        "quantity": "8"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "frittata-di-zucchine",
    "title": "Frittata di zucchine",
    "englishTitle": "Zucchini omelette",
    "aliases": [
      "Zucchini omelette"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Uova",
        "quantity": "6"
      },
      {
        "name": "Zucchine",
        "quantity": "400 g"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "uova-strapazzate",
    "title": "Uova strapazzate",
    "englishTitle": "Scrambled eggs",
    "aliases": [
      "Scrambled eggs"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Uova",
        "quantity": "8"
      },
      {
        "name": "Burro",
        "quantity": "30 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "parmigiana-di-melanzane",
    "title": "Parmigiana di melanzane",
    "englishTitle": "Eggplant parmesan",
    "aliases": [
      "Eggplant parmesan",
      "parmigiana",
      "melanzane alla parmigiana"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Melanzane",
        "quantity": "1000 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "700 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "300 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "100 g"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio per friggere",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "peperoni-ripieni",
    "title": "Peperoni ripieni",
    "englishTitle": "Stuffed peppers",
    "aliases": [
      "Stuffed peppers"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Peperoni",
        "quantity": "4"
      },
      {
        "name": "Carne macinata",
        "quantity": "400 g"
      },
      {
        "name": "Pane",
        "quantity": "100 g",
        "glutenSwap": "Pane senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "1"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "zucchine-ripiene",
    "title": "Zucchine ripiene",
    "englishTitle": "Stuffed zucchini",
    "aliases": [
      "Stuffed zucchini"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Zucchine",
        "quantity": "4"
      },
      {
        "name": "Carne macinata",
        "quantity": "350 g"
      },
      {
        "name": "Pangrattato",
        "quantity": "60 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "1"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "insalata-caprese",
    "title": "Insalata caprese",
    "englishTitle": "Caprese salad",
    "aliases": [
      "Caprese salad",
      "caprese"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pomodori",
        "quantity": "600 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "400 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "insalata-greca",
    "title": "Insalata greca",
    "englishTitle": "Greek salad",
    "aliases": [
      "Greek salad"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pomodori",
        "quantity": "400 g"
      },
      {
        "name": "Cetrioli",
        "quantity": "2"
      },
      {
        "name": "Feta",
        "quantity": "200 g",
        "lactoseSwap": "Feta senza lattosio"
      },
      {
        "name": "Olive nere",
        "quantity": "100 g"
      },
      {
        "name": "Cipolla rossa",
        "quantity": "1"
      },
      {
        "name": "Origano",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "insalata-di-pollo",
    "title": "Insalata di pollo",
    "englishTitle": "Chicken salad",
    "aliases": [
      "Chicken salad"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Petto di pollo",
        "quantity": "500 g"
      },
      {
        "name": "Lattuga",
        "quantity": "200 g"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Pomodorini",
        "quantity": "200 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "orata-al-forno",
    "title": "Orata al forno",
    "englishTitle": "Baked sea bream",
    "aliases": [
      "Baked sea bream"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Orata",
        "quantity": "1200 g"
      },
      {
        "name": "Patate",
        "quantity": "600 g"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "salmone-al-forno",
    "title": "Salmone al forno",
    "englishTitle": "Baked salmon",
    "aliases": [
      "Baked salmon"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Filetti di salmone",
        "quantity": "600 g"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "merluzzo-al-pomodoro",
    "title": "Merluzzo al pomodoro",
    "englishTitle": "Cod in tomato sauce",
    "aliases": [
      "Cod in tomato sauce"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Merluzzo",
        "quantity": "700 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "400 g"
      },
      {
        "name": "Olive",
        "quantity": "80 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "calamari-ripieni",
    "title": "Calamari ripieni",
    "englishTitle": "Stuffed squid",
    "aliases": [
      "Stuffed squid"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Calamari",
        "quantity": "800 g"
      },
      {
        "name": "Pangrattato",
        "quantity": "100 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "frittura-di-pesce",
    "title": "Frittura di pesce",
    "englishTitle": "Fried seafood",
    "aliases": [
      "Fried seafood"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Calamari",
        "quantity": "500 g"
      },
      {
        "name": "Gamberetti",
        "quantity": "400 g"
      },
      {
        "name": "Farina",
        "quantity": "150 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Olio per friggere",
        "quantity": "1000 ml"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cozze-alla-marinara",
    "title": "Cozze alla marinara",
    "englishTitle": "Mussels marinara",
    "aliases": [
      "Mussels marinara"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cozze",
        "quantity": "1500 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Vino bianco",
        "quantity": "150 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      }
    ]
  },
  {
    "id": "zuppa-di-pesce",
    "title": "Zuppa di pesce",
    "englishTitle": "Fish soup",
    "aliases": [
      "Fish soup"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pesce misto per zuppa",
        "quantity": "1000 g"
      },
      {
        "name": "Cozze",
        "quantity": "500 g"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "500 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Pane",
        "quantity": "300 g",
        "glutenSwap": "Pane senza glutine"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "patate-al-forno",
    "title": "Patate al forno",
    "englishTitle": "Roast potatoes",
    "aliases": [
      "Roast potatoes"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Patate",
        "quantity": "1000 g"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "4 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pur-di-patate",
    "title": "Purè di patate",
    "englishTitle": "Mashed potatoes",
    "aliases": [
      "Mashed potatoes",
      "pure di patate"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Patate",
        "quantity": "1000 g"
      },
      {
        "name": "Latte",
        "quantity": "250 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Burro",
        "quantity": "60 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Noce moscata",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "verdure-grigliate",
    "title": "Verdure grigliate",
    "englishTitle": "Grilled vegetables",
    "aliases": [
      "Grilled vegetables"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Zucchine",
        "quantity": "400 g"
      },
      {
        "name": "Melanzane",
        "quantity": "400 g"
      },
      {
        "name": "Peperoni",
        "quantity": "2"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "caponata",
    "title": "Caponata",
    "englishTitle": "Caponata",
    "aliases": [
      "Caponata"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Melanzane",
        "quantity": "700 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "300 g"
      },
      {
        "name": "Sedano",
        "quantity": "2 coste"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Olive",
        "quantity": "100 g"
      },
      {
        "name": "Capperi",
        "quantity": "30 g"
      },
      {
        "name": "Aceto",
        "quantity": "50 ml"
      },
      {
        "name": "Zucchero",
        "quantity": "20 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "4 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "hummus",
    "title": "Hummus",
    "englishTitle": "Hummus",
    "aliases": [
      "Hummus"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Ceci cotti",
        "quantity": "500 g"
      },
      {
        "name": "Tahina",
        "quantity": "60 g"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Cumino",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "falafel",
    "title": "Falafel",
    "englishTitle": "Falafel",
    "aliases": [
      "Falafel"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Ceci secchi",
        "quantity": "300 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Cumino",
        "quantity": "1 cucchiaino"
      },
      {
        "name": "Olio per friggere",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cous-cous-alle-verdure",
    "title": "Cous cous alle verdure",
    "englishTitle": "Vegetable couscous",
    "aliases": [
      "Vegetable couscous",
      "couscous alle verdure",
      "cous cous"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cous cous",
        "quantity": "300 g",
        "glutenSwap": "Cous cous senza glutine"
      },
      {
        "name": "Zucchine",
        "quantity": "300 g"
      },
      {
        "name": "Carote",
        "quantity": "200 g"
      },
      {
        "name": "Peperoni",
        "quantity": "2"
      },
      {
        "name": "Ceci cotti",
        "quantity": "300 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "350 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "paella",
    "title": "Paella",
    "englishTitle": "Paella",
    "aliases": [
      "Paella",
      "paella mista"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso",
        "quantity": "320 g"
      },
      {
        "name": "Pollo",
        "quantity": "400 g"
      },
      {
        "name": "Gamberetti",
        "quantity": "300 g"
      },
      {
        "name": "Cozze",
        "quantity": "500 g"
      },
      {
        "name": "Piselli",
        "quantity": "150 g"
      },
      {
        "name": "Peperoni",
        "quantity": "1"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "300 g"
      },
      {
        "name": "Zafferano",
        "quantity": "1 bustina"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "riso-alla-cantonese",
    "title": "Riso alla cantonese",
    "englishTitle": "Cantonese fried rice",
    "aliases": [
      "Cantonese fried rice",
      "riso cantonese",
      "fried rice"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso",
        "quantity": "320 g"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Piselli",
        "quantity": "150 g"
      },
      {
        "name": "Prosciutto cotto",
        "quantity": "150 g"
      },
      {
        "name": "Salsa di soia",
        "quantity": "40 ml",
        "glutenSwap": "Salsa di soia senza glutine"
      },
      {
        "name": "Olio di semi",
        "quantity": "3 cucchiai"
      }
    ]
  },
  {
    "id": "chili-con-carne",
    "title": "Chili con carne",
    "englishTitle": "Chili con carne",
    "aliases": [
      "Chili con carne"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne macinata",
        "quantity": "500 g"
      },
      {
        "name": "Fagioli cotti",
        "quantity": "400 g"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Peperoni",
        "quantity": "1"
      },
      {
        "name": "Cumino",
        "quantity": "1 cucchiaino"
      },
      {
        "name": "Peperoncino",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "tacos-di-carne",
    "title": "Tacos di carne",
    "englishTitle": "Beef tacos",
    "aliases": [
      "Beef tacos",
      "tacos"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Tortillas di mais",
        "quantity": "8"
      },
      {
        "name": "Carne macinata",
        "quantity": "500 g"
      },
      {
        "name": "Lattuga",
        "quantity": "150 g"
      },
      {
        "name": "Pomodori",
        "quantity": "300 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Avocado",
        "quantity": "1"
      },
      {
        "name": "Lime",
        "quantity": "1"
      },
      {
        "name": "Cumino",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "guacamole",
    "title": "Guacamole",
    "englishTitle": "Guacamole",
    "aliases": [
      "Guacamole"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Avocado",
        "quantity": "2"
      },
      {
        "name": "Pomodoro",
        "quantity": "1"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Lime",
        "quantity": "1"
      },
      {
        "name": "Coriandolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "hamburger",
    "title": "Hamburger",
    "englishTitle": "Beef burger",
    "aliases": [
      "Beef burger",
      "burger"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne macinata",
        "quantity": "600 g"
      },
      {
        "name": "Panini per hamburger",
        "quantity": "4",
        "glutenSwap": "Panini per hamburger senza glutine"
      },
      {
        "name": "Lattuga",
        "quantity": "100 g"
      },
      {
        "name": "Pomodori",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "quiche-lorraine",
    "title": "Quiche lorraine",
    "englishTitle": "Quiche lorraine",
    "aliases": [
      "Quiche lorraine"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta brisée",
        "quantity": "250 g",
        "glutenSwap": "Pasta brisée senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Panna",
        "quantity": "200 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Pancetta",
        "quantity": "200 g"
      },
      {
        "name": "Formaggio grattugiato",
        "quantity": "100 g",
        "lactoseSwap": "Formaggio grattugiato senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "ratatouille",
    "title": "Ratatouille",
    "englishTitle": "Ratatouille",
    "aliases": [
      "Ratatouille"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Melanzane",
        "quantity": "400 g"
      },
      {
        "name": "Zucchine",
        "quantity": "400 g"
      },
      {
        "name": "Peperoni",
        "quantity": "2"
      },
      {
        "name": "Pomodori",
        "quantity": "500 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "4 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "fish-and-chips",
    "title": "Fish and chips",
    "englishTitle": "Fish and chips",
    "aliases": [
      "Fish and chips"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Merluzzo",
        "quantity": "700 g"
      },
      {
        "name": "Patate",
        "quantity": "800 g"
      },
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Acqua frizzante",
        "quantity": "250 ml"
      },
      {
        "name": "Olio per friggere",
        "quantity": "1000 ml"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pancake",
    "title": "Pancake",
    "englishTitle": "Pancakes",
    "aliases": [
      "Pancakes",
      "pancakes"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Latte",
        "quantity": "250 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Zucchero",
        "quantity": "40 g"
      },
      {
        "name": "Burro",
        "quantity": "30 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "8 g"
      }
    ]
  },
  {
    "id": "cr-pes",
    "title": "Crêpes",
    "englishTitle": "Crepes",
    "aliases": [
      "Crepes",
      "crepes",
      "crespelle"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Latte",
        "quantity": "400 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Burro",
        "quantity": "40 g",
        "lactoseSwap": "Burro senza lattosio"
      }
    ]
  },
  {
    "id": "crespelle-ricotta-e-spinaci",
    "title": "Crespelle ricotta e spinaci",
    "englishTitle": "Ricotta and spinach crepes",
    "aliases": [
      "Ricotta and spinach crepes"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Latte",
        "quantity": "400 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Burro",
        "quantity": "40 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Ricotta",
        "quantity": "300 g",
        "lactoseSwap": "Ricotta senza lattosio"
      },
      {
        "name": "Spinaci",
        "quantity": "400 g"
      },
      {
        "name": "Besciamella",
        "quantity": "400 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "torta-al-cioccolato",
    "title": "Torta al cioccolato",
    "englishTitle": "Chocolate cake",
    "aliases": [
      "Chocolate cake"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Cioccolato fondente",
        "quantity": "200 g"
      },
      {
        "name": "Burro",
        "quantity": "120 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "150 g"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "8 g"
      }
    ]
  },
  {
    "id": "crostata-alla-marmellata",
    "title": "Crostata alla marmellata",
    "englishTitle": "Jam tart",
    "aliases": [
      "Jam tart",
      "crostata"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "300 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Burro",
        "quantity": "150 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "100 g"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Marmellata",
        "quantity": "300 g"
      }
    ]
  },
  {
    "id": "panna-cotta",
    "title": "Panna cotta",
    "englishTitle": "Panna cotta",
    "aliases": [
      "Panna cotta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Panna",
        "quantity": "500 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "80 g"
      },
      {
        "name": "Gelatina alimentare",
        "quantity": "6 g"
      },
      {
        "name": "Vaniglia",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cheesecake",
    "title": "Cheesecake",
    "englishTitle": "Cheesecake",
    "aliases": [
      "Cheesecake",
      "cheesecake fredda"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Biscotti",
        "quantity": "200 g",
        "glutenSwap": "Biscotti senza glutine"
      },
      {
        "name": "Burro",
        "quantity": "80 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Formaggio spalmabile",
        "quantity": "400 g",
        "lactoseSwap": "Formaggio spalmabile senza lattosio"
      },
      {
        "name": "Panna",
        "quantity": "200 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "100 g"
      },
      {
        "name": "Gelatina alimentare",
        "quantity": "8 g"
      }
    ]
  },
  {
    "id": "brownies",
    "title": "Brownies",
    "englishTitle": "Brownies",
    "aliases": [
      "Brownies",
      "brownie"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cioccolato fondente",
        "quantity": "200 g"
      },
      {
        "name": "Burro",
        "quantity": "120 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "150 g"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Farina",
        "quantity": "100 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Cacao amaro",
        "quantity": "30 g"
      }
    ]
  },
  {
    "id": "muffin",
    "title": "Muffin",
    "englishTitle": "Muffins",
    "aliases": [
      "Muffins",
      "muffins"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "250 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Latte",
        "quantity": "150 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Zucchero",
        "quantity": "120 g"
      },
      {
        "name": "Burro",
        "quantity": "80 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "12 g"
      }
    ]
  },
  {
    "id": "ciambellone",
    "title": "Ciambellone",
    "englishTitle": "Ring cake",
    "aliases": [
      "Ring cake",
      "ciambella"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "300 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Zucchero",
        "quantity": "180 g"
      },
      {
        "name": "Latte",
        "quantity": "200 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Olio di semi",
        "quantity": "100 ml"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "16 g"
      }
    ]
  },
  {
    "id": "torta-allo-yogurt",
    "title": "Torta allo yogurt",
    "englishTitle": "Yogurt cake",
    "aliases": [
      "Yogurt cake"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "250 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Yogurt",
        "quantity": "250 g",
        "lactoseSwap": "Yogurt senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Zucchero",
        "quantity": "150 g"
      },
      {
        "name": "Olio di semi",
        "quantity": "80 ml"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "16 g"
      }
    ]
  },
  {
    "id": "torta-caprese",
    "title": "Torta caprese",
    "englishTitle": "Caprese chocolate almond cake",
    "aliases": [
      "Caprese chocolate almond cake"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Mandorle",
        "quantity": "200 g"
      },
      {
        "name": "Cioccolato fondente",
        "quantity": "200 g"
      },
      {
        "name": "Burro",
        "quantity": "150 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "150 g"
      },
      {
        "name": "Uova",
        "quantity": "4"
      }
    ]
  },
  {
    "id": "biscotti-al-burro",
    "title": "Biscotti al burro",
    "englishTitle": "Butter biscuits",
    "aliases": [
      "Butter biscuits",
      "biscotti"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "300 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Burro",
        "quantity": "150 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "100 g"
      },
      {
        "name": "Uova",
        "quantity": "1"
      }
    ]
  },
  {
    "id": "crema-pasticcera",
    "title": "Crema pasticcera",
    "englishTitle": "Pastry cream",
    "aliases": [
      "Pastry cream"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Latte",
        "quantity": "500 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Tuorli",
        "quantity": "4"
      },
      {
        "name": "Zucchero",
        "quantity": "100 g"
      },
      {
        "name": "Amido di mais",
        "quantity": "40 g"
      },
      {
        "name": "Vaniglia",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "profiteroles",
    "title": "Profiteroles",
    "englishTitle": "Profiteroles",
    "aliases": [
      "Profiteroles"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Bignè",
        "quantity": "200 g",
        "glutenSwap": "Bignè senza glutine"
      },
      {
        "name": "Panna",
        "quantity": "500 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Cioccolato fondente",
        "quantity": "200 g"
      },
      {
        "name": "Zucchero",
        "quantity": "60 g"
      }
    ]
  },
  {
    "id": "zabaione",
    "title": "Zabaione",
    "englishTitle": "Zabaglione",
    "aliases": [
      "Zabaglione"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Tuorli",
        "quantity": "4"
      },
      {
        "name": "Zucchero",
        "quantity": "80 g"
      },
      {
        "name": "Marsala",
        "quantity": "80 ml"
      }
    ]
  },
  {
    "id": "macedonia",
    "title": "Macedonia",
    "englishTitle": "Fruit salad",
    "aliases": [
      "Fruit salad",
      "macedonia di frutta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Mele",
        "quantity": "2"
      },
      {
        "name": "Banane",
        "quantity": "2"
      },
      {
        "name": "Kiwi",
        "quantity": "2"
      },
      {
        "name": "Fragole",
        "quantity": "250 g"
      },
      {
        "name": "Arancia",
        "quantity": "1"
      },
      {
        "name": "Limone",
        "quantity": "1"
      }
    ]
  },
  {
    "id": "aglio-olio-peperoncino",
    "title": "Spaghetti aglio, olio e peperoncino",
    "aliases": [
      "spaghetti aglio olio e peperoncino",
      "aglio olio peperoncino",
      "Spaghetti with garlic oil and chili"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Spaghetti",
        "quantity": "320 g",
        "glutenSwap": "Spaghetti senza glutine"
      },
      {
        "name": "Aglio",
        "quantity": "3 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "6 cucchiai"
      },
      {
        "name": "Peperoncino",
        "quantity": "q.b."
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ],
    "englishTitle": "Spaghetti with garlic oil and chili"
  },
  {
    "id": "cannoli",
    "title": "Cannoli siciliani",
    "aliases": [
      "cannoli",
      "cannoli siciliani",
      "cannolo",
      "Sicilian cannoli"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "125 g",
        "glutenSwap": "Farina senza glutine per dolci"
      },
      {
        "name": "Ricotta",
        "quantity": "250 g",
        "lactoseSwap": "Ricotta senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "75 g"
      },
      {
        "name": "Cacao amaro",
        "quantity": "10 g"
      },
      {
        "name": "Gocce di cioccolato",
        "quantity": "40 g"
      },
      {
        "name": "Olio per friggere",
        "quantity": "q.b."
      }
    ],
    "englishTitle": "Sicilian cannoli"
  },
  {
    "id": "cinghiale",
    "title": "Spaghetti al sugo di cinghiale",
    "aliases": [
      "spaghetti al sugo di cinghiale",
      "pasta al cinghiale",
      "sugo di cinghiale",
      "Pasta with wild boar sauce"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Spaghetti",
        "quantity": "320 g",
        "glutenSwap": "Spaghetti senza glutine"
      },
      {
        "name": "Carne di cinghiale",
        "quantity": "400 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Vino rosso",
        "quantity": "150 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Sale e pepe",
        "quantity": "q.b."
      }
    ],
    "englishTitle": "Pasta with wild boar sauce"
  },
  {
    "id": "pizza",
    "title": "Pizza margherita",
    "aliases": [
      "pizza",
      "margherita",
      "pizza margherita",
      "Margherita pizza"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "500 g",
        "glutenSwap": "Mix farina per pizza senza glutine"
      },
      {
        "name": "Acqua",
        "quantity": "325 ml"
      },
      {
        "name": "Lievito di birra",
        "quantity": "5 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "400 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "300 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "10 g"
      }
    ],
    "englishTitle": "Margherita pizza"
  },
  {
    "id": "pizzoccheri",
    "title": "Pizzoccheri",
    "englishTitle": "Pizzoccheri",
    "aliases": [
      "pizzoccheri della valtellina",
      "pizzoccheri valtellinesi"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pizzoccheri",
        "quantity": "320 g",
        "glutenSwap": "Pizzoccheri senza glutine"
      },
      {
        "name": "Patate",
        "quantity": "300 g"
      },
      {
        "name": "Verza",
        "quantity": "300 g"
      },
      {
        "name": "Formaggio Casera",
        "quantity": "200 g",
        "lactoseSwap": "Alternativa al Casera senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Burro",
        "quantity": "80 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Salvia",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  }
];

export const CATALOG_FOOD_EN: Record<string, string> = {
  "Verza": "savoy cabbage",
  "Formaggio Casera": "Casera cheese",
  "Alternativa al Casera senza lattosio": "lactose-free alternative to Casera cheese",
  "Pizzoccheri senza glutine": "gluten-free pizzoccheri",
  "Cannelloni": "cannelloni",
  "Ricotta": "ricotta",
  "Spinaci": "spinach",
  "Noce moscata": "nutmeg",
  "Carote": "carrots",
  "Funghi": "mushrooms",
  "Pinoli": "pine nuts",
  "Bucatini": "bucatini",
  "Pomodori pelati": "peeled tomatoes",
  "Olive nere": "black olives",
  "Capperi": "capers",
  "Acciughe": "anchovies",
  "Penne": "penne",
  "Tonno": "tuna",
  "Salmone": "salmon",
  "Panna": "cream",
  "Gorgonzola": "gorgonzola",
  "Fontina": "fontina",
  "Taleggio": "taleggio",
  "Vongole": "clams",
  "Gamberetti": "shrimp",
  "Pasta corta": "short pasta",
  "Fagioli cotti": "cooked beans",
  "Ceci cotti": "cooked chickpeas",
  "Pomodorini": "cherry tomatoes",
  "Olive": "olives",
  "Gnocchi di patate": "potato gnocchi",
  "Salvia": "sage",
  "Tortellini": "tortellini",
  "Brodo di carne": "meat stock",
  "Zafferano": "saffron",
  "Brodo vegetale": "vegetable stock",
  "Zucca": "pumpkin",
  "Asparagi": "asparagus",
  "Cozze": "mussels",
  "Calamari": "squid",
  "Brodo di pesce": "fish stock",
  "Mais": "sweetcorn",
  "Farina di mais": "cornmeal",
  "Patate": "potatoes",
  "Lenticchie secche": "dried lentils",
  "Cavolo nero": "Tuscan kale",
  "Pane": "bread",
  "Origano": "oregano",
  "Fettine di vitello": "veal escalopes",
  "Prosciutto crudo": "cured ham",
  "Vino bianco": "white wine",
  "Carne di manzo": "beef",
  "Ossobuchi di vitello": "veal shanks",
  "Alloro": "bay leaves",
  "Carne di vitello": "veal",
  "Pollo": "chicken",
  "Petto di pollo": "chicken breast",
  "Latte di cocco": "coconut milk",
  "Curry": "curry powder",
  "Mandorle": "almonds",
  "Salsa di soia": "soy sauce",
  "Zenzero": "ginger",
  "Amido di mais": "cornstarch",
  "Olio di semi": "vegetable oil",
  "Peperoni": "bell peppers",
  "Cetrioli": "cucumbers",
  "Feta": "feta",
  "Cipolla rossa": "red onion",
  "Lattuga": "lettuce",
  "Orata": "sea bream",
  "Filetti di salmone": "salmon fillets",
  "Merluzzo": "cod",
  "Pesce misto per zuppa": "mixed fish for soup",
  "Aceto": "vinegar",
  "Tahina": "tahini",
  "Cumino": "cumin",
  "Ceci secchi": "dried chickpeas",
  "Cous cous": "couscous",
  "Prosciutto cotto": "cooked ham",
  "Tortillas di mais": "corn tortillas",
  "Avocado": "avocado",
  "Lime": "lime",
  "Coriandolo": "coriander",
  "Panini per hamburger": "burger buns",
  "Pasta brisée": "shortcrust pastry",
  "Formaggio grattugiato": "grated cheese",
  "Acqua frizzante": "sparkling water",
  "Cioccolato fondente": "dark chocolate",
  "Marmellata": "jam",
  "Gelatina alimentare": "gelatine",
  "Vaniglia": "vanilla",
  "Biscotti": "biscuits",
  "Formaggio spalmabile": "cream cheese",
  "Yogurt": "yogurt",
  "Tuorli": "egg yolks",
  "Bignè": "choux pastry puffs",
  "Marsala": "Marsala wine",
  "Banane": "bananas",
  "Kiwi": "kiwi",
  "Fragole": "strawberries",
  "Arancia": "orange",
  "Carne di cinghiale": "wild boar meat",
  "Vino rosso": "red wine",
  "Rosmarino": "rosemary",
  "Peperoncino": "chili",
  "Olio per friggere": "frying oil",
  "Lievito di birra": "baker's yeast",
  "Cannelloni senza glutine": "gluten-free cannelloni",
  "Cannelloni senza lattosio": "lactose-free cannelloni",
  "Ricotta senza glutine": "gluten-free ricotta",
  "Ricotta senza lattosio": "lactose-free ricotta",
  "Spinaci senza glutine": "gluten-free spinach",
  "Spinaci senza lattosio": "lactose-free spinach",
  "Noce moscata senza glutine": "gluten-free nutmeg",
  "Noce moscata senza lattosio": "lactose-free nutmeg",
  "Carote senza glutine": "gluten-free carrots",
  "Carote senza lattosio": "lactose-free carrots",
  "Funghi senza glutine": "gluten-free mushrooms",
  "Funghi senza lattosio": "lactose-free mushrooms",
  "Pinoli senza glutine": "gluten-free pine nuts",
  "Pinoli senza lattosio": "lactose-free pine nuts",
  "Bucatini senza glutine": "gluten-free bucatini",
  "Bucatini senza lattosio": "lactose-free bucatini",
  "Pomodori pelati senza glutine": "gluten-free peeled tomatoes",
  "Pomodori pelati senza lattosio": "lactose-free peeled tomatoes",
  "Olive nere senza glutine": "gluten-free black olives",
  "Olive nere senza lattosio": "lactose-free black olives",
  "Capperi senza glutine": "gluten-free capers",
  "Capperi senza lattosio": "lactose-free capers",
  "Acciughe senza glutine": "gluten-free anchovies",
  "Acciughe senza lattosio": "lactose-free anchovies",
  "Penne senza glutine": "gluten-free penne",
  "Penne senza lattosio": "lactose-free penne",
  "Tonno senza glutine": "gluten-free tuna",
  "Tonno senza lattosio": "lactose-free tuna",
  "Salmone senza glutine": "gluten-free salmon",
  "Salmone senza lattosio": "lactose-free salmon",
  "Panna senza glutine": "gluten-free cream",
  "Panna senza lattosio": "lactose-free cream",
  "Gorgonzola senza glutine": "gluten-free gorgonzola",
  "Gorgonzola senza lattosio": "lactose-free gorgonzola",
  "Fontina senza glutine": "gluten-free fontina",
  "Fontina senza lattosio": "lactose-free fontina",
  "Taleggio senza glutine": "gluten-free taleggio",
  "Taleggio senza lattosio": "lactose-free taleggio",
  "Vongole senza glutine": "gluten-free clams",
  "Vongole senza lattosio": "lactose-free clams",
  "Gamberetti senza glutine": "gluten-free shrimp",
  "Gamberetti senza lattosio": "lactose-free shrimp",
  "Pasta corta senza glutine": "gluten-free short pasta",
  "Pasta corta senza lattosio": "lactose-free short pasta",
  "Fagioli cotti senza glutine": "gluten-free cooked beans",
  "Fagioli cotti senza lattosio": "lactose-free cooked beans",
  "Ceci cotti senza glutine": "gluten-free cooked chickpeas",
  "Ceci cotti senza lattosio": "lactose-free cooked chickpeas",
  "Pomodorini senza glutine": "gluten-free cherry tomatoes",
  "Pomodorini senza lattosio": "lactose-free cherry tomatoes",
  "Olive senza glutine": "gluten-free olives",
  "Olive senza lattosio": "lactose-free olives",
  "Gnocchi di patate senza glutine": "gluten-free potato gnocchi",
  "Gnocchi di patate senza lattosio": "lactose-free potato gnocchi",
  "Salvia senza glutine": "gluten-free sage",
  "Salvia senza lattosio": "lactose-free sage",
  "Tortellini senza glutine": "gluten-free tortellini",
  "Tortellini senza lattosio": "lactose-free tortellini",
  "Brodo di carne senza glutine": "gluten-free meat stock",
  "Brodo di carne senza lattosio": "lactose-free meat stock",
  "Zafferano senza glutine": "gluten-free saffron",
  "Zafferano senza lattosio": "lactose-free saffron",
  "Brodo vegetale senza glutine": "gluten-free vegetable stock",
  "Brodo vegetale senza lattosio": "lactose-free vegetable stock",
  "Zucca senza glutine": "gluten-free pumpkin",
  "Zucca senza lattosio": "lactose-free pumpkin",
  "Asparagi senza glutine": "gluten-free asparagus",
  "Asparagi senza lattosio": "lactose-free asparagus",
  "Cozze senza glutine": "gluten-free mussels",
  "Cozze senza lattosio": "lactose-free mussels",
  "Calamari senza glutine": "gluten-free squid",
  "Calamari senza lattosio": "lactose-free squid",
  "Brodo di pesce senza glutine": "gluten-free fish stock",
  "Brodo di pesce senza lattosio": "lactose-free fish stock",
  "Mais senza glutine": "gluten-free sweetcorn",
  "Mais senza lattosio": "lactose-free sweetcorn",
  "Farina di mais senza glutine": "gluten-free cornmeal",
  "Farina di mais senza lattosio": "lactose-free cornmeal",
  "Patate senza glutine": "gluten-free potatoes",
  "Patate senza lattosio": "lactose-free potatoes",
  "Lenticchie secche senza glutine": "gluten-free dried lentils",
  "Lenticchie secche senza lattosio": "lactose-free dried lentils",
  "Cavolo nero senza glutine": "gluten-free Tuscan kale",
  "Cavolo nero senza lattosio": "lactose-free Tuscan kale",
  "Pane senza glutine": "gluten-free bread",
  "Pane senza lattosio": "lactose-free bread",
  "Origano senza glutine": "gluten-free oregano",
  "Origano senza lattosio": "lactose-free oregano",
  "Fettine di vitello senza glutine": "gluten-free veal escalopes",
  "Fettine di vitello senza lattosio": "lactose-free veal escalopes",
  "Prosciutto crudo senza glutine": "gluten-free cured ham",
  "Prosciutto crudo senza lattosio": "lactose-free cured ham",
  "Vino bianco senza glutine": "gluten-free white wine",
  "Vino bianco senza lattosio": "lactose-free white wine",
  "Carne di manzo senza glutine": "gluten-free beef",
  "Carne di manzo senza lattosio": "lactose-free beef",
  "Ossobuchi di vitello senza glutine": "gluten-free veal shanks",
  "Ossobuchi di vitello senza lattosio": "lactose-free veal shanks",
  "Alloro senza glutine": "gluten-free bay leaves",
  "Alloro senza lattosio": "lactose-free bay leaves",
  "Carne di vitello senza glutine": "gluten-free veal",
  "Carne di vitello senza lattosio": "lactose-free veal",
  "Pollo senza glutine": "gluten-free chicken",
  "Pollo senza lattosio": "lactose-free chicken",
  "Petto di pollo senza glutine": "gluten-free chicken breast",
  "Petto di pollo senza lattosio": "lactose-free chicken breast",
  "Latte di cocco senza glutine": "gluten-free coconut milk",
  "Latte di cocco senza lattosio": "lactose-free coconut milk",
  "Curry senza glutine": "gluten-free curry powder",
  "Curry senza lattosio": "lactose-free curry powder",
  "Mandorle senza glutine": "gluten-free almonds",
  "Mandorle senza lattosio": "lactose-free almonds",
  "Salsa di soia senza glutine": "gluten-free soy sauce",
  "Salsa di soia senza lattosio": "lactose-free soy sauce",
  "Zenzero senza glutine": "gluten-free ginger",
  "Zenzero senza lattosio": "lactose-free ginger",
  "Amido di mais senza glutine": "gluten-free cornstarch",
  "Amido di mais senza lattosio": "lactose-free cornstarch",
  "Olio di semi senza glutine": "gluten-free vegetable oil",
  "Olio di semi senza lattosio": "lactose-free vegetable oil",
  "Peperoni senza glutine": "gluten-free bell peppers",
  "Peperoni senza lattosio": "lactose-free bell peppers",
  "Cetrioli senza glutine": "gluten-free cucumbers",
  "Cetrioli senza lattosio": "lactose-free cucumbers",
  "Feta senza glutine": "gluten-free feta",
  "Feta senza lattosio": "lactose-free feta",
  "Cipolla rossa senza glutine": "gluten-free red onion",
  "Cipolla rossa senza lattosio": "lactose-free red onion",
  "Lattuga senza glutine": "gluten-free lettuce",
  "Lattuga senza lattosio": "lactose-free lettuce",
  "Orata senza glutine": "gluten-free sea bream",
  "Orata senza lattosio": "lactose-free sea bream",
  "Filetti di salmone senza glutine": "gluten-free salmon fillets",
  "Filetti di salmone senza lattosio": "lactose-free salmon fillets",
  "Merluzzo senza glutine": "gluten-free cod",
  "Merluzzo senza lattosio": "lactose-free cod",
  "Pesce misto per zuppa senza glutine": "gluten-free mixed fish for soup",
  "Pesce misto per zuppa senza lattosio": "lactose-free mixed fish for soup",
  "Aceto senza glutine": "gluten-free vinegar",
  "Aceto senza lattosio": "lactose-free vinegar",
  "Tahina senza glutine": "gluten-free tahini",
  "Tahina senza lattosio": "lactose-free tahini",
  "Cumino senza glutine": "gluten-free cumin",
  "Cumino senza lattosio": "lactose-free cumin",
  "Ceci secchi senza glutine": "gluten-free dried chickpeas",
  "Ceci secchi senza lattosio": "lactose-free dried chickpeas",
  "Cous cous senza glutine": "gluten-free couscous",
  "Cous cous senza lattosio": "lactose-free couscous",
  "Prosciutto cotto senza glutine": "gluten-free cooked ham",
  "Prosciutto cotto senza lattosio": "lactose-free cooked ham",
  "Tortillas di mais senza glutine": "gluten-free corn tortillas",
  "Tortillas di mais senza lattosio": "lactose-free corn tortillas",
  "Avocado senza glutine": "gluten-free avocado",
  "Avocado senza lattosio": "lactose-free avocado",
  "Lime senza glutine": "gluten-free lime",
  "Lime senza lattosio": "lactose-free lime",
  "Coriandolo senza glutine": "gluten-free coriander",
  "Coriandolo senza lattosio": "lactose-free coriander",
  "Panini per hamburger senza glutine": "gluten-free burger buns",
  "Panini per hamburger senza lattosio": "lactose-free burger buns",
  "Pasta brisée senza glutine": "gluten-free shortcrust pastry",
  "Pasta brisée senza lattosio": "lactose-free shortcrust pastry",
  "Formaggio grattugiato senza glutine": "gluten-free grated cheese",
  "Formaggio grattugiato senza lattosio": "lactose-free grated cheese",
  "Acqua frizzante senza glutine": "gluten-free sparkling water",
  "Acqua frizzante senza lattosio": "lactose-free sparkling water",
  "Cioccolato fondente senza glutine": "gluten-free dark chocolate",
  "Cioccolato fondente senza lattosio": "lactose-free dark chocolate",
  "Marmellata senza glutine": "gluten-free jam",
  "Marmellata senza lattosio": "lactose-free jam",
  "Gelatina alimentare senza glutine": "gluten-free gelatine",
  "Gelatina alimentare senza lattosio": "lactose-free gelatine",
  "Vaniglia senza glutine": "gluten-free vanilla",
  "Vaniglia senza lattosio": "lactose-free vanilla",
  "Biscotti senza glutine": "gluten-free biscuits",
  "Biscotti senza lattosio": "lactose-free biscuits",
  "Formaggio spalmabile senza glutine": "gluten-free cream cheese",
  "Formaggio spalmabile senza lattosio": "lactose-free cream cheese",
  "Yogurt senza glutine": "gluten-free yogurt",
  "Yogurt senza lattosio": "lactose-free yogurt",
  "Tuorli senza glutine": "gluten-free egg yolks",
  "Tuorli senza lattosio": "lactose-free egg yolks",
  "Bignè senza glutine": "gluten-free choux pastry puffs",
  "Bignè senza lattosio": "lactose-free choux pastry puffs",
  "Marsala senza glutine": "gluten-free Marsala wine",
  "Marsala senza lattosio": "lactose-free Marsala wine",
  "Banane senza glutine": "gluten-free bananas",
  "Banane senza lattosio": "lactose-free bananas",
  "Kiwi senza glutine": "gluten-free kiwi",
  "Kiwi senza lattosio": "lactose-free kiwi",
  "Fragole senza glutine": "gluten-free strawberries",
  "Fragole senza lattosio": "lactose-free strawberries",
  "Arancia senza glutine": "gluten-free orange",
  "Arancia senza lattosio": "lactose-free orange",
  "Carne di cinghiale senza glutine": "gluten-free wild boar meat",
  "Carne di cinghiale senza lattosio": "lactose-free wild boar meat",
  "Vino rosso senza glutine": "gluten-free red wine",
  "Vino rosso senza lattosio": "lactose-free red wine",
  "Rosmarino senza glutine": "gluten-free rosemary",
  "Rosmarino senza lattosio": "lactose-free rosemary",
  "Peperoncino senza glutine": "gluten-free chili",
  "Peperoncino senza lattosio": "lactose-free chili",
  "Olio per friggere senza glutine": "gluten-free frying oil",
  "Olio per friggere senza lattosio": "lactose-free frying oil",
  "Lievito di birra senza glutine": "gluten-free baker's yeast",
  "Lievito di birra senza lattosio": "lactose-free baker's yeast"
};
