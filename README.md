# Caeli Tasks ⚡

Caeli Tasks es una aplicación de productividad inteligente impulsada por Inteligencia Artificial, diseñada para unificar la gestión de tareas, notas, hábitos y alarmas en una sola interfaz moderna, responsiva y con una estética *dark glassmorphism*.

## 🌟 Características Principales

* **Asistente de IA (Caeli):** Una asistente personal conversacional (potenciada por los modelos de NVIDIA NIM) capaz de entender lenguaje natural y ejecutar operaciones CRUD de forma autónoma. Puedes pedirle cosas como: *"Caeli, recuérdame comprar leche mañana"* o *"Elimina todas las notas sobre recetas"* y ella interactuará directamente con la base de datos.
* **Gestión Integral:**
  * **Tareas:** Listas de quehaceres con fechas de vencimiento.
  * **Notas:** Bloc de notas rápido y organizado.
  * **Reglas/Hábitos:** Seguimiento de hábitos por días de la semana con registro de cumplimiento (logs).
  * **Alarmas:** Notificaciones y alarmas sonoras programables integradas en el navegador.
* **Memoria Semántica (RAG):** Utiliza *NVIDIA Embeddings* y *Supabase pgvector* para convertir tus notas y tareas en vectores. Esto dota a la IA de memoria a largo plazo, permitiéndole recordar información de tu perfil y buscar entre tus apuntes pasados de forma inteligente.
* **Interfaz Premium:** Diseño fluido en *dark mode* con desenfoques de cristal (*glassmorphism*), gradientes en tonos morados/cian, animaciones responsivas con `anime.js` y un diseño completamente adaptable a pantallas de móviles.
* **Perfil Personalizado:** Sistema de usuarios con avatares (auto-comprimidos en base64) donde la IA reconoce tu nombre y adapta la conversación a ti.

## 🛠️ Stack Tecnológico

* **Frontend:** React 19, TypeScript, Vite.
* **Estilos:** Vanilla CSS (CSS Modules / Variables Globales).
* **Iconografía & Animaciones:** `lucide-react` y `anime.js`.
* **Backend & Base de Datos:** Supabase (PostgreSQL, Row Level Security, Auth).
* **Búsqueda Vectorial:** extensión `pgvector` en Supabase.
* **Inteligencia Artificial:** API de NVIDIA NIM (Modelos de Chat y Embeddings).
* **Renderizado de Markdown:** `react-markdown` para dar formato rico a las respuestas de la IA.

## 🚀 Instalación y Configuración

1. **Clonar e instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configuración de Variables de Entorno:**
   Crea un archivo `.env` en la raíz del proyecto basándote en la configuración necesaria:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   VITE_NVIDIA_API_KEY=tu_nvidia_api_key
   ```

3. **Base de Datos:**
   Ejecuta el archivo `supabase/migrations/schema.sql` en el SQL Editor de tu proyecto en Supabase. Esto creará las tablas (`tasks`, `notes`, `rules`, `rule_logs`, `document_vectors`, `profiles`, `chat_history`) junto con sus políticas de seguridad (RLS) y la extensión `vector`.

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## 🧠 ¿Cómo funciona el motor de la IA?

El asistente (Caeli) funciona inyectando el estado actual de la aplicación (tareas pendientes, notas recientes) dentro de su *System Prompt*. Si la IA decide que debe crear, actualizar o eliminar un recurso tras leer tu mensaje, emite un bloque oculto de formato JSON envuelto en etiquetas `<APP_ACTION>`. 

El frontend intercepta el flujo de texto (streaming), extrae estas acciones, oculta el código fuente al usuario y ejecuta las mutaciones en Supabase en tiempo real, brindando una experiencia mágica y fluida.
