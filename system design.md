Aquí tenés la especificación completa del sistema de diseño de **iOS adaptado estrictamente al Dark Mode**, con los tokens exactos, jerarquía de elevación de capas, materiales translúcidos y componentes listos para implementar en tu web app.

---

### 1. Paleta de Colores Semántica (iOS Dark Mode)

En iOS Dark Mode, los fondos no son un `#000000` plano para todo: se estructuran en **niveles de profundidad (elevaciones)** y según si la pantalla es estándar o agrupada (*grouped lists/settings*).

#### Fondos y Superficies (System Backgrounds)

| Token Semántico | Valor Hex / RGBA | Uso en iOS |
| --- | --- | --- |
| `--ios-bg-base` | `#000000` | Fondo base de la pantalla completa y listas agrupadas |
| `--ios-bg-secondary` | `#1C1C1E` | Celdas de listas (*Inset Grouped*), cards y contenedores |
| `--ios-bg-tertiary` | `#2C2C2E` | Elementos dentro de cards (inputs, sub-bloques) |
| `--ios-bg-elevated-primary` | `#1C1C1E` | Fondo de modales, bottom sheets o popovers |
| `--ios-bg-elevated-secondary` | `#2C2C2E` | Celdas dentro de un modal o sheet |
| `--ios-bg-elevated-tertiary` | `#3A3A3C` | Inputs o controles dentro de modales |

#### Colores de Acento (System Tints - Dark Mode)

*Los colores de acento en Dark Mode son ligeramente más luminosos y saturados que en Light Mode para mantener el contraste:*

| Token | Hex | Uso |
| --- | --- | --- |
| `--ios-blue` | `#0A84FF` | Botones principales, enlaces, tabs activas |
| `--ios-green` | `#30D158` | Estados de éxito, switches activos |
| `--ios-red` | `#FF453A` | Acciones destructivas, errores |
| `--ios-orange` | `#FF9F0A` | Advertencias, badges de alerta |
| `--ios-yellow` | `#FFD60A` | Destacados, ratings |
| `--ios-indigo` | `#5E5CE6` | Acentos alternativos |

#### Colores de Texto y Separadores

| Token | Valor RGBA | Uso |
| --- | --- | --- |
| `--ios-label-primary` | `#FFFFFF` (`100%`) | Títulos, texto principal |
| `--ios-label-secondary` | `rgba(235, 235, 245, 0.60)` | Subtítulos, metadatos |
| `--ios-label-tertiary` | `rgba(235, 235, 245, 0.30)` | Placeholders, textos deshabilitados |
| `--ios-label-quaternary` | `rgba(235, 235, 245, 0.18)` | Iconos secundarios o deshabilitados |
| `--ios-separator` | `rgba(84, 84, 88, 0.65)` | Líneas divisoras delgadas (`0.5px`) |
| `--ios-separator-opaque` | `#38383A` | Separadores sin transparencia |

---

### 2. Materiales y Translucidez (Dark Materials / Blur)

iOS aplica un desenfoque pesado con tinte oscuro para barras fijas (`Navigation Bar` y `Tab Bar`), permitiendo que el contenido scrollee por debajo:

```css
:root {
  /* Material Ultrathick / Chrome Dark */
  --ios-bar-bg: rgba(28, 28, 30, 0.75);
  --ios-bar-blur: blur(25px) saturate(190%);
}

.ios-nav-bar,
.ios-tab-bar {
  background-color: var(--ios-bar-bg);
  backdrop-filter: var(--ios-bar-blur);
  -webkit-backdrop-filter: var(--ios-bar-blur);
}

.ios-nav-bar {
  border-bottom: 0.5px solid var(--ios-separator);
}

.ios-tab-bar {
  border-top: 0.5px solid var(--ios-separator);
}
```

---

### 3. Tokens CSS para tu Proyecto

Podés pegar esto directo en tu archivo CSS global:

```css
:root {
  /* Tipografía y sistema base */
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: #000000;
  color: #FFFFFF;
  color-scheme: dark;

  /* Fondos */
  --ios-bg: #000000;
  --ios-card: #1C1C1E;
  --ios-card-hover: #2C2C2E;
  --ios-input-bg: #2C2C2E;

  /* Texto */
  --text-primary: #FFFFFF;
  --text-secondary: rgba(235, 235, 245, 0.60);
  --text-tertiary: rgba(235, 235, 245, 0.30);

  /* Acentos */
  --accent-blue: #0A84FF;
  --accent-blue-dim: rgba(10, 132, 255, 0.15);
  --accent-destructive: #FF453A;
  --accent-success: #30D158;

  /* Bordes & Separadores */
  --ios-border: rgba(84, 84, 88, 0.65);
}
```

---

### 4. Estructura de Componentes Clave en Dark Mode

#### A. Inset Grouped List (El patrón estándar de Ajustes/Configuraciones)

* Fondo general: `#000000`.
* Caja/Card: `#1C1C1E`, `border-radius: 12px`, márgenes laterales `16px`.
* Separadores: `0.5px solid rgba(84, 84, 88, 0.65)` con un `margin-left: 16px` (no toca el borde izquierdo).
* Feedback al tocar (`:active`): `#2C2C2E`.

```html
<div style="padding: 0 16px; margin-bottom: 24px;">
  <p style="font-size: 13px; text-transform: uppercase; color: var(--text-secondary); margin-left: 16px; margin-bottom: 8px;">
    Cuenta
  </p>
  <div style="background-color: var(--ios-card); border-radius: 12px; overflow: hidden;">
    <div style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 17px; color: var(--text-primary);">Perfil</span>
      <span style="font-size: 17px; color: var(--text-secondary);">Julio ›</span>
    </div>
    <div style="height: 0.5px; background: var(--ios-border); margin-left: 16px;"></div>
    <div style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 17px; color: var(--text-primary);">Notificaciones</span>
      <span style="font-size: 17px; color: var(--text-secondary);">Activadas ›</span>
    </div>
  </div>
</div>
```

#### B. Botones iOS en Dark Mode

1. **Filled:** Fondo `#0A84FF`, texto `#FFFFFF`, `border-radius: 12px` (o `9999px` si es cápsula), peso `600` (Semibold), altura/área táctil mínima `44px`.
2. **Tinted / Subdued:** Fondo `rgba(10, 132, 255, 0.15)`, texto `#0A84FF`, altura/área táctil mínima `44px`.
3. **Plain:** Solo texto `#0A84FF` con tamaño `17px`, padding táctil mínimo `44px`.
4. **Destructive:** Texto o fondo `#FF453A`.

#### C. Inputs y Búsqueda (Search Bar)

* Fondo de input: `#1C1C1E` o `#2C2C2E` con `border-radius: 10px` o `rounded-xl`.
* Placeholder: `rgba(235, 235, 245, 0.30)`.
* Altura estándar: `44px` (touch target mínimo para mobile) con tamaño de fuente `16px` para prevenir zoom automático indeseado en Safari iOS.

---

### 5. Configuraciones críticas para Web App Mobile (PWA / Safari)

Para que Safari e iOS no muestren bordes blancos ni barras desfasadas y se respete la accesibilidad:

```html
<head>
  <!-- Respeta el notch/Dynamic Island y preserva el zoom accesible (WCAG) -->
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  
  <!-- Fuerza el status bar negro en standalone/PWA -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#000000">
</head>
```

```css
/* Manejo estructural de áreas seguras en el layout raíz (body) */
body {
  padding-bottom: env(safe-area-inset-bottom, 0px);
  -webkit-tap-highlight-color: transparent;
}
```

---

### 6. Preservación de Accesibilidad, Zoom y Selección de Texto

1. **Preservación del Zoom del Usuario (WCAG 1.4.4):**
   - No restringir la escala máxima ni deshabilitar la capacidad de escalado en la configuración del `viewport`.
   - Los usuarios con discapacidad visual o necesidades de ampliación deben poder hacer zoom libremente en la interfaz sin bloqueos artificiales.

2. **Preservación de Selección de Texto:**
   - Evitar `user-select: none` a nivel global en `body` o contenedores principales de lectura.
   - Los usuarios deben poder seleccionar y copiar libremente números de cuenta, importes, categorías, fechas y datos de transacciones.

3. **Comportamiento Táctil Acotado por Componente:**
   - Las reglas como `user-select: none` o `-webkit-touch-callout: none` solo deben aplicarse de manera acotada a componentes interactivos concretos (botones de acción, switches o controles táctiles dedicados que manejan feedback activo `:active`).
   - El resto de los textos y datos de la aplicación debe permanecer completamente seleccionable.

4. **Objetivos Táctiles (Touch Targets >= 44px):**
   - Todos los elementos interactivos (botones `default`, `sm`, `lg`, `icon` y sliders de rango) deben proporcionar un objetivo táctil físico de al menos `44x44px`, cumpliendo con las directrices de Apple Human Interface Guidelines y WCAG 2.5.5.
