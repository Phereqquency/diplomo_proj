-- Create WelcomePage table for storing page content as JSON
CREATE TABLE WelcomePage (
    id INT PRIMARY KEY IDENTITY(1,1),
    content NVARCHAR(MAX) NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_by INT NULL
);

-- Insert default content (matches original homepage: hero + services grid + CTA + footer)
INSERT INTO WelcomePage (content) VALUES (
    N'{
  "blocks": [
    {
      "type": "hero",
      "props": {
        "title": "Добро пожаловать в наш сервис",
        "subtitle": "Профессиональные услуги по лучшим ценам",
        "image": "",
        "text": ""
      }
    },
    {
      "type": "services",
      "props": {
        "title": "Наши услуги"
      }
    },
    {
      "type": "cta",
      "props": {
        "text": "Заказать услугу",
        "link": "/register"
      }
    },
    {
      "type": "footer",
      "props": {
        "text": "© 2025 СервисЦентр. Все права защищены."
      }
    }
  ]
}'
);

-- Insert default content
INSERT INTO WelcomePage (content) VALUES (
    N'{
  "blocks": [
    {
      "type": "hero",
      "props": {
        "title": "Добро пожаловать в наш сервис",
        "subtitle": "Профессиональные услуги по лучшим ценам",
        "image": "",
        "text": ""
      }
    },
    {
      "type": "features",
      "props": {
        "title": "Почему выбирают нас",
        "items": [
          {"icon": "✓", "title": "Качество", "text": "Гарантия качества всех работ"},
          {"icon": "⏱", "title": "Скорость", "text": "Быстрое выполнение заказов"},
          {"icon": "💰", "title": "Цены", "text": "Доступные цены"}
        ]
      }
    },
    {
      "type": "cta",
      "props": {
        "text": "Заказать услугу",
        "link": "/register"
      }
    },
    {
      "type": "footer",
      "props": {
        "text": "© 2025 СервисЦентр. Все права защищены."
      }
    }
  ]
}'
);
