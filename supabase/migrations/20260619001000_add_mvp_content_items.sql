-- MVP database-backed language content for Baby Steps.
--
-- This is intentionally not a CMS. Game rules, routing, rendering, scoring,
-- and achievements stay in the React Native codebase. This table stores only
-- language-specific content payloads needed by the MVP vertical slice.
-- content_type and slug values are lowercase app content keys; route filenames
-- can still keep legacy names such as app/child/(tabs)/Stories.tsx.

BEGIN;

INSERT INTO public.languages (code, name, native_name, is_active)
VALUES
  ('lg', 'Luganda', 'Oluganda', true),
  ('nyn', 'Runyankole', 'Runyankole', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name,
  is_active = EXCLUDED.is_active;

CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  language_code text NOT NULL,
  content_type text NOT NULL,
  slug text NOT NULL,
  title text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT content_items_pkey PRIMARY KEY (id),
  CONSTRAINT content_items_language_code_fkey
    FOREIGN KEY (language_code)
    REFERENCES public.languages(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT content_items_unique_language_type_slug UNIQUE (language_code, content_type, slug),
  CONSTRAINT content_items_language_code_not_blank CHECK (length(trim(language_code)) > 0),
  CONSTRAINT content_items_content_type_not_blank CHECK (length(trim(content_type)) > 0),
  CONSTRAINT content_items_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT content_items_payload_is_object CHECK (jsonb_typeof(payload) = 'object')
);

COMMENT ON TABLE public.content_items IS
  'MVP language content storage using flexible jsonb payloads. This is not a CMS and does not own app/game logic.';
COMMENT ON COLUMN public.content_items.payload IS
  'Language-specific data only: menu cards, lesson stages, word choices, counting labels, story pages, and media references.';
COMMENT ON COLUMN public.content_items.content_type IS
  'MVP grouping key such as child_menu, learning_game, word_game, counting_game, or story.';

CREATE INDEX IF NOT EXISTS idx_content_items_language_type_active
ON public.content_items(language_code, content_type, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_content_items_language_slug
ON public.content_items(language_code, slug);

CREATE INDEX IF NOT EXISTS idx_content_items_payload_gin
ON public.content_items USING gin(payload);

CREATE OR REPLACE FUNCTION public.set_content_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_content_items_updated_at ON public.content_items;
CREATE TRIGGER set_content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW
EXECUTE FUNCTION public.set_content_items_updated_at();

INSERT INTO public.content_items (
  language_code,
  content_type,
  slug,
  title,
  payload,
  sort_order,
  is_active
)
VALUES
  (
    'lg',
    'child_menu',
    'games',
    'Games',
    $json$
    {
      "cards": [
        {
          "id": "words",
          "title": "Words",
          "description": "Fill in the missing letters to complete the word",
          "image": "african-focus.png",
          "targetPage": "child/games/wordgame"
        },
        {
          "id": "logic",
          "title": "Logic",
          "description": "Solve puzzles inspired by popular Buganda heritage sites",
          "image": "african-logic.png",
          "targetPage": "child/games/puzzlegame"
        },
        {
          "id": "cards",
          "title": "Cards Matching",
          "description": "Match the cards to learn about Buganda cultural items",
          "image": "cards-matching.png",
          "targetPage": "child/games/cardgame"
        },
        {
          "id": "learning",
          "title": "Learning",
          "description": "Learn common Luganda words and how they are used in sentences",
          "image": "african-patterns.png",
          "targetPage": "child/games/learninggame"
        },
        {
          "id": "numbers",
          "title": "Numbers",
          "description": "Count with Luganda number labels",
          "image": "numbers.png",
          "targetPage": "child/games/lugandacountinggame"
        }
      ]
    }
    $json$::jsonb,
    10,
    true
  ),
  (
    'lg',
    'child_menu',
    'stories',
    'Stories',
    $json$
    {
      "cards": [
        {
          "id": "kintu",
          "title": "Kintu",
          "description": "Learn about Kintu, the first person on Earth according to Buganda mythology",
          "image": "kintu.jpg",
          "targetPage": "child/stories/kintustory",
          "availability": "legacy-lg"
        },
        {
          "id": "mwanga",
          "title": "Kabaka Mwanga",
          "description": "Discover the story of Kabaka Mwanga II of Buganda",
          "image": "mwanga.jpg",
          "targetPage": "child/stories/mwangastory",
          "availability": "legacy-lg"
        },
        {
          "id": "kasubi",
          "title": "Kasubi Tombs",
          "description": "Explore the UNESCO World Heritage Site of Kasubi Tombs",
          "image": "kasubi.jpg",
          "targetPage": "child/stories/kasubitombsstory",
          "availability": "legacy-lg"
        },
        {
          "id": "walumbe",
          "title": "Walumbe and Death",
          "description": "Learn about Walumbe and the origin of death",
          "image": "buganda-kingdom.jpg",
          "targetPage": "child/stories/walumbestory",
          "availability": "legacy-lg"
        },
        {
          "id": "ssezibwa",
          "title": "Ssezibwa Falls",
          "description": "Follow the historical origin of Ssezibwa Falls",
          "image": "kabaka-trail.jpg",
          "targetPage": "child/stories/ssezibwafallsstory",
          "availability": "legacy-lg"
        },
        {
          "id": "millet",
          "title": "Nambi and the First Millet",
          "description": "Discover the story of Nambi and the first millet",
          "image": "culture.jpg",
          "targetPage": "child/stories/milletstory",
          "availability": "legacy-lg"
        },
        {
          "id": "kasokambirye",
          "title": "Kasokambirye and the Moon",
          "description": "Discover the story of Kasokambirye and the moon",
          "image": "culture.jpg",
          "targetPage": "child/stories/kasokambiryestory",
          "availability": "legacy-lg"
        },
        {
          "id": "fig-tree",
          "title": "The Generous Fig Tree",
          "description": "Discover the story of the generous fig tree",
          "image": "culture.jpg",
          "targetPage": "child/stories/figtreestory",
          "availability": "legacy-lg"
        }
      ]
    }
    $json$::jsonb,
    20,
    true
  ),
  (
    'lg',
    'learning_game',
    'starter',
    'Luganda Starter Learning',
    $json$
    {
      "stages": [
        {
          "id": 1,
          "title": "Beginner",
          "description": "Learn basic Luganda words and phrases",
          "isLocked": false,
          "requiredScore": 0,
          "color": "#4F85E6",
          "image": "coin.png",
          "levels": [
            {
              "id": 1,
              "title": "Greetings",
              "isLocked": false,
              "words": [
                {
                  "id": "lg-oli-otya",
                  "targetText": "Oli otya",
                  "english": "How are you",
                  "example": "Oli otya leero?",
                  "exampleTranslation": "How are you today?",
                  "audio": "oli-otya.m4a",
                  "image": "learning-beginner.jpg"
                },
                {
                  "id": "lg-bulungi",
                  "targetText": "Bulungi",
                  "english": "Good/Fine",
                  "example": "Ndi bulungi, webale.",
                  "exampleTranslation": "I am fine, thank you.",
                  "audio": "Bulungi.mp3",
                  "image": "learning-beginner.jpg"
                },
                {
                  "id": "lg-webale",
                  "targetText": "Webale",
                  "english": "Thank you",
                  "example": "Webale nnyo!",
                  "exampleTranslation": "Thank you very much!",
                  "audio": "webale.m4a",
                  "image": "learning-beginner.jpg"
                }
              ]
            }
          ]
        }
      ]
    }
    $json$::jsonb,
    30,
    true
  ),
  (
    'lg',
    'word_game',
    'levels',
    'Luganda Word Game',
    $json$
    {
      "levels": [
        {
          "id": "lg-word-amazzi",
          "targetText": "AMAZZI",
          "question": "Essential liquid that falls from the sky",
          "hint": "You drink this every day to stay healthy",
          "subHint": "In English, it is called water.",
          "image": "rain.jpg"
        },
        {
          "id": "lg-word-embwa",
          "targetText": "EMBWA",
          "question": "Loyal four-legged companion in homes",
          "hint": "This animal barks and wags its tail when happy",
          "subHint": "In English, it is called dog.",
          "image": "dog.jpg"
        },
        {
          "id": "lg-word-omugga",
          "targetText": "OMUGGA",
          "question": "Flowing water body like the mighty Nile",
          "hint": "Fish live in it, and it flows from one place to another",
          "subHint": "In English, it is called river.",
          "image": "river-kids.jpg"
        }
      ]
    }
    $json$::jsonb,
    40,
    true
  ),
  (
    'lg',
    'counting_game',
    'stages',
    'Luganda Counting Game',
    $json$
    {
      "title": "Luganda Counting Game",
      "stages": [
        {
          "id": 1,
          "title": "Basic Counting (1-10)",
          "description": "Learn to count individual items from 1 to 10 in Luganda",
          "numbersRange": { "min": 1, "max": 10 },
          "levels": 5,
          "useBunches": false,
          "usesCurrency": false,
          "prompt": "Balanga {item} emeka? (How many {item} do you see?)"
        }
      ],
      "numbers": [
        { "number": 1, "targetText": "Emu", "audio": "correct.mp3" },
        { "number": 2, "targetText": "Bbiri", "audio": "correct.mp3" },
        { "number": 3, "targetText": "Ssatu", "audio": "correct.mp3" },
        { "number": 4, "targetText": "Nnya", "audio": "correct.mp3" },
        { "number": 5, "targetText": "Ttaano", "audio": "correct.mp3" },
        { "number": 6, "targetText": "Mukaaga", "audio": "correct.mp3" },
        { "number": 7, "targetText": "Musanvu", "audio": "correct.mp3" },
        { "number": 8, "targetText": "Munaana", "audio": "correct.mp3" },
        { "number": 9, "targetText": "Mwenda", "audio": "correct.mp3" },
        { "number": 10, "targetText": "Kkumi", "audio": "correct.mp3" }
      ],
      "culturalItems": [
        { "name": "matoke", "image": "matooke.png" },
        { "name": "mangoes", "image": "mango.png" },
        { "name": "goats", "image": "goat.png" },
        { "name": "baskets", "image": "basket.png" }
      ],
      "currency": []
    }
    $json$::jsonb,
    50,
    true
  ),
  (
    'nyn',
    'child_menu',
    'games',
    'Games',
    $json$
    {
      "cards": [
        {
          "id": "words",
          "title": "Words",
          "description": "Practice Runyankole sample words",
          "image": "african-focus.png",
          "targetPage": "child/games/wordgame"
        },
        {
          "id": "learning",
          "title": "Learning",
          "description": "Learn starter Runyankole words and examples",
          "image": "african-patterns.png",
          "targetPage": "child/games/learninggame"
        },
        {
          "id": "numbers",
          "title": "Numbers",
          "description": "Count with Runyankole sample number labels",
          "image": "numbers.png",
          "targetPage": "child/games/lugandacountinggame"
        }
      ]
    }
    $json$::jsonb,
    10,
    true
  ),
  (
    'nyn',
    'child_menu',
    'stories',
    'Stories',
    $json$
    {
      "cards": [
        {
          "id": "nyn-sample-morning-greeting",
          "title": "Agandi Omuka",
          "description": "A short Runyankole sample greeting story",
          "image": "learning-beginner.jpg",
          "targetPage": "child/stories/nyn-sample-morning-greeting"
        }
      ]
    }
    $json$::jsonb,
    20,
    true
  ),
  (
    'nyn',
    'learning_game',
    'starter',
    'Runyankole Starter Learning',
    $json$
    {
      "stages": [
        {
          "id": 1,
          "title": "Runyankole Starter Samples",
          "description": "Placeholder greetings and home words for testing language-specific lessons.",
          "isLocked": false,
          "requiredScore": 0,
          "color": "#0F766E",
          "image": "learning-beginner.jpg",
          "levels": [
            {
              "id": 1,
              "title": "Greetings",
              "isLocked": false,
              "words": [
                {
                  "id": "nyn-word-agandi",
                  "targetText": "Agandi",
                  "english": "How are you? / Other news?",
                  "example": "Agandi?",
                  "exampleTranslation": "How are you?",
                  "audio": "correct.mp3",
                  "image": "learning-beginner.jpg"
                },
                {
                  "id": "nyn-word-nimarungi",
                  "targetText": "Nimarungi",
                  "english": "Good news / I am fine",
                  "example": "Nimarungi.",
                  "exampleTranslation": "I am fine.",
                  "audio": "correct.mp3",
                  "image": "learning-beginner.jpg"
                },
                {
                  "id": "nyn-word-webare",
                  "targetText": "Webare",
                  "english": "Thank you",
                  "example": "Webare munonga.",
                  "exampleTranslation": "Thank you very much.",
                  "audio": "correct.mp3",
                  "image": "learning-beginner.jpg"
                }
              ]
            }
          ]
        }
      ]
    }
    $json$::jsonb,
    30,
    true
  ),
  (
    'nyn',
    'word_game',
    'levels',
    'Runyankole Word Game',
    $json$
    {
      "levels": [
        {
          "id": "nyn-word-game-agandi",
          "targetText": "AGANDI",
          "question": "A simple Runyankole greeting",
          "hint": "Use this when greeting someone.",
          "subHint": "It can mean How are you? or Any news?",
          "image": "learning-beginner.jpg"
        },
        {
          "id": "nyn-word-game-webare",
          "targetText": "WEBARE",
          "question": "A polite word used to show thanks",
          "hint": "Say this after someone helps you.",
          "subHint": "In English, it means thank you.",
          "image": "learning-beginner.jpg"
        }
      ]
    }
    $json$::jsonb,
    40,
    true
  ),
  (
    'nyn',
    'counting_game',
    'stages',
    'Runyankole Counting Samples',
    $json$
    {
      "title": "Runyankole Counting Samples",
      "stages": [
        {
          "id": 1,
          "title": "Basic Counting Samples (1-5)",
          "description": "Placeholder Runyankole counting labels for language-switching tests.",
          "numbersRange": { "min": 1, "max": 5 },
          "levels": 5,
          "useBunches": false,
          "usesCurrency": false,
          "prompt": "Bara {item}. How many {item} do you see?"
        }
      ],
      "numbers": [
        { "number": 1, "targetText": "Emwe", "audio": "correct.mp3" },
        { "number": 2, "targetText": "Ibiri", "audio": "correct.mp3" },
        { "number": 3, "targetText": "Ishatu", "audio": "correct.mp3" },
        { "number": 4, "targetText": "Ina", "audio": "correct.mp3" },
        { "number": 5, "targetText": "Itaano", "audio": "correct.mp3" }
      ],
      "culturalItems": [
        { "name": "cups", "image": "coin.png" },
        { "name": "beans", "image": "bean.png" },
        { "name": "baskets", "image": "basket.png" }
      ],
      "currency": []
    }
    $json$::jsonb,
    50,
    true
  ),
  (
    'nyn',
    'story',
    'nyn-sample-morning-greeting',
    'Agandi Omuka',
    $json$
    {
      "id": "nyn-sample-morning-greeting",
      "title": "Agandi Omuka",
      "summary": "Placeholder story shell using simple Runyankole greetings for language-switching tests.",
      "languageCode": "nyn",
      "metadata": {
        "status": "placeholder",
        "notes": "Not final story curriculum. Keep short until reviewed by a Runyankole language specialist."
      },
      "pages": [
        {
          "id": "nyn-sample-morning-greeting-page-1",
          "text": "Agandi? Nimarungi. A learner greets the family at home before starting the day.",
          "translation": "How are you? I am fine. A learner greets the family at home before starting the day.",
          "image": "learning-beginner.jpg",
          "altText": "A learner greeting family at home"
        },
        {
          "id": "nyn-sample-morning-greeting-page-2",
          "text": "Webare, Mama. The learner thanks Mama and helps count cups of water.",
          "translation": "Thank you, Mama. The learner thanks Mama and helps count cups of water.",
          "image": "learning-beginner.jpg",
          "altText": "A learner helping at home"
        }
      ],
      "questions": [
        {
          "id": "nyn-sample-morning-greeting-question-1",
          "question": "Which greeting appears in the sample story?",
          "options": ["Agandi", "Oli otya", "Kkumi", "Kabaka"],
          "correctAnswer": 0
        }
      ]
    }
    $json$::jsonb,
    60,
    true
  )
ON CONFLICT (language_code, content_type, slug) DO UPDATE
SET
  title = EXCLUDED.title,
  payload = EXCLUDED.payload,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc'::text, now());

COMMIT;
