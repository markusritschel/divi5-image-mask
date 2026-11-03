// Visual Builder: an "Image Mask" group on Divi 5's Image module (Design tab), modelled on Divi's Background > Mask
// settings, plus its live preview. Saved at image.advanced.mask (desktop value only); on the page the plugin's PHP
// (d5im_mask_css) adds the same CSS to the module's .et_pb_image_wrap.
(function () {
  const hooks = window.vendor?.wp?.hooks;
  if (!hooks) {
    return;
  }
  // Divi's mask shapes. Divi loads that bundle itself after the first render, so it is looked up when needed.
  const library = () => window.divi?.maskAndPatternLibrary;
  const GROUP = "designImageMask";
  // Texts in the site's language, translated by the plugin's PHP (d5im_builder_texts()); English without it.
  const texts = window.Divi5ImageMaskData?.texts ?? {};
  const __ = (text) => texts[text] ?? text;

  const maskOf = (attrs) => attrs?.image?.advanced?.mask?.desktop?.value ?? {};
  const customOf = (mask) =>
    typeof mask.custom === "string" ? mask.custom.trim() : "";
  const hasMask = (mask) =>
    customOf(mask) !== "" || !["", "none", undefined].includes(mask.style);
  const usesStyle = (mask) => hasMask(mask) && customOf(mask) === "";
  const isPlaced = (mask) =>
    hasMask(mask) && (mask.size ?? "stretch") !== "stretch";

  const length = (value, fallback) =>
    typeof value === "string" && /^-?\d*\.?\d+(px|%|em|rem|vw|vh)?$/.test(value)
      ? value
      : fallback;

  // Same output as d5im_mask_css() in divi5-image-mask.php: see there.
  const maskCss = (mask) => {
    const transform = Array.isArray(mask.transform) ? mask.transform : [];
    const invert = transform.includes("invert");
    const custom = customOf(mask).replace(/["\\]/g, "").replace(/ /g, "%20");
    const size = mask.size ?? "stretch";
    const layers = [];

    if (custom) {
      layers.push(`url("${custom}")`);
    } else if (hasMask(mask)) {
      const shapes = library();
      if (!shapes) {
        return null; // Not loaded yet: the preview tries again.
      }
      const type = ["portrait", "square"].includes(mask.aspectRatio)
        ? mask.aspectRatio
        : "landscape";
      let svg = shapes.getMaskSvg({
        style: mask.style,
        color: "#000",
        size,
        type,
        rotated: transform.includes("rotate"),
        inverted: !invert,
        escape: false,
      });
      if (!svg) {
        return "";
      }
      // Flips go into the SVG: a CSS transform would flip the image too.
      const flipH = transform.includes("flipHorizontal");
      const flipV = transform.includes("flipVertical");
      if (flipH || flipV) {
        const [, , width, height] = shapes
          .getMaskDefaultViewboxSettings()
          [type].split(" ");
        const matrix = `matrix(${flipH ? -1 : 1} 0 0 ${flipV ? -1 : 1} ${flipH ? width : 0} ${flipV ? height : 0})`;
        const open = svg.indexOf(">") + 1;
        svg = `${svg.slice(0, open)}<g transform="${matrix}">${svg.slice(open, -6)}</g></svg>`;
      }
      layers.push(`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    } else {
      return "";
    }

    const cssSize =
      size === "custom"
        ? `${length(mask.width, "auto")} ${length(mask.height, "auto")}`
        : ["cover", "contain"].includes(size)
          ? size
          : "100% 100%";
    const position = String(mask.position ?? "center").split(" ");
    const x = position.find((word) => word === "left" || word === "right");
    const y = position.find((word) => word === "top" || word === "bottom");
    const sizes = [cssSize];
    const positions = [
      `${x ? `${x} ${length(mask.horizontalOffset, "0%")}` : "left 50%"} ${y ? `${y} ${length(mask.verticalOffset, "0%")}` : "top 50%"}`,
    ];
    let composite = "";

    // Inverting a custom mask: subtract it from a full layer, at the mask's position (see the PHP).
    if (custom && invert) {
      layers.push("linear-gradient(#000 0 0)");
      sizes.push("100% 100%");
      positions.push(positions[0]);
      composite = "mask-composite:exclude;";
    }

    return `mask-image:${layers.join(",")};mask-size:${sizes.join(",")};mask-position:${positions.join(",")};mask-repeat:no-repeat;${composite}`;
  };

  // The zoom animation needs sizes CSS can interpolate from 0: not the keywords cover and contain.
  const isZoomable = (mask) =>
    hasMask(mask) && ["stretch", "custom"].includes(mask.size ?? "stretch");
  const isAnimated = (mask) => isZoomable(mask) && mask.animation === "zoom";
  const time = (value, fallback) =>
    typeof value === "string" && /^\d*\.?\d+(ms|s)?$/.test(value)
      ? /^[\d.]+$/.test(value)
        ? `${value}ms`
        : value
      : fallback;

  // Same output as d5im_animation_css() in divi5-image-mask.php: see there.
  const animationCss = (mask) => {
    if (!isAnimated(mask)) {
      return "";
    }
    const easing = ["ease-in-out", "ease-in", "ease-out", "linear"].includes(
      mask.animationEasing,
    )
      ? mask.animationEasing
      : "ease";
    const loop = mask.animationRepeat === "loop" ? " infinite" : "";
    return `d5im-zoom ${time(mask.animationDuration, "500ms")} ${easing} ${time(mask.animationDelay, "0ms")}${loop} both`;
  };

  // Divi's Background > Mask fields, without colour and blend mode (meaningless for a clip). One value for all
  // breakpoints and states.
  const field = (
    subName,
    priority,
    label,
    description,
    component,
    visible,
    extra,
  ) => ({
    groupSlug: GROUP,
    subName,
    label,
    description,
    priority,
    render: true,
    category: "configuration",
    features: {
      responsive: false,
      hover: false,
      sticky: false,
      preset: ["style"],
    },
    component: { type: "field", ...component },
    ...(visible && { visible: ({ attrs }) => visible(maskOf(attrs)) }),
    ...extra,
  });
  const percentRange = (min) => ({
    allowEmpty: true,
    defaultUnit: "%",
    min,
    max: 100,
    step: 1,
  });
  const repeatOptions = {
    once: { label: __("Once") },
    view: { label: __("Every Time in View") },
    loop: { label: __("Loop") },
  };
  const transformOptions = {
    flipHorizontal: {
      icon: "divi/flip-horizontal",
      label: __("Flip Horizontal"),
    },
    flipVertical: { icon: "divi/flip-vertical", label: __("Flip Vertical") },
    rotate: { icon: "divi/transform-rotate", label: __("Rotate 90°") },
    invert: { icon: "divi/transform-invert", label: __("Invert") },
  };

  const items = {
    style: field(
      "style",
      10,
      __("Mask Shape"),
      __("One of Divi's mask shapes. The image stays visible where a Divi background would show through the same mask."),
      { name: "divi/select-mask", props: { hasPreview: false } },
    ),
    custom: field(
      "custom",
      20,
      __("Custom Mask"),
      __("An SVG or PNG instead of the mask shape. The image stays visible where the mask is opaque."),
      { name: "divi/upload" },
    ),
    transform: field(
      "transform",
      30,
      __("Transform"),
      "",
      {
        name: "divi/button-options",
        props: { options: transformOptions, showLabel: false },
      },
      hasMask,
      {
        multipleChoices: true,
        onChangeParams: ["multipleChoices"],
        // An uploaded mask can only be inverted: flipping or rotating it would need the image flipped too.
        filterComponentProps: (props) =>
          customOf(maskOf(props.attrs))
            ? { ...props, options: { invert: transformOptions.invert } }
            : props,
      },
    ),
    aspectRatio: field(
      "aspectRatio",
      40,
      __("Aspect Ratio"),
      "",
      {
        name: "divi/button-options",
        props: {
          options: {
            landscape: {
              icon: "divi/aspect-ratio-landscape",
              label: __("Landscape"),
            },
            square: { icon: "divi/aspect-ratio-square", label: __("Square") },
            portrait: {
              icon: "divi/aspect-ratio-portrait",
              label: __("Portrait"),
            },
          },
          showLabel: false,
        },
      },
      usesStyle,
      { defaultAttr: { desktop: { value: { aspectRatio: "landscape" } } } },
    ),
    size: field(
      "size",
      50,
      __("Size"),
      "",
      {
        name: "divi/select",
        props: {
          options: {
            stretch: { label: __("Stretch to Fill") },
            cover: { label: __("Cover") },
            contain: { label: __("Fit") },
            custom: { label: __("Custom Size") },
          },
        },
      },
      hasMask,
      { defaultAttr: { desktop: { value: { size: "stretch" } } } },
    ),
    width: field(
      "width",
      60,
      __("Width"),
      "",
      { name: "divi/range", props: percentRange(0) },
      (mask) => hasMask(mask) && mask.size === "custom",
    ),
    height: field(
      "height",
      70,
      __("Height"),
      "",
      { name: "divi/range", props: percentRange(0) },
      (mask) => hasMask(mask) && mask.size === "custom",
    ),
    position: field(
      "position",
      80,
      __("Position"),
      "",
      {
        name: "divi/select",
        props: {
          options: {
            center: { label: __("Center") },
            "top left": { label: __("Top Left") },
            top: { label: __("Top") },
            "top right": { label: __("Top Right") },
            right: { label: __("Right") },
            "bottom right": { label: __("Bottom Right") },
            bottom: { label: __("Bottom") },
            "bottom left": { label: __("Bottom Left") },
            left: { label: __("Left") },
          },
        },
      },
      isPlaced,
      { defaultAttr: { desktop: { value: { position: "center" } } } },
    ),
    horizontalOffset: field(
      "horizontalOffset",
      90,
      __("Horizontal Offset"),
      "",
      { name: "divi/range", props: percentRange(-100) },
      isPlaced,
    ),
    verticalOffset: field(
      "verticalOffset",
      100,
      __("Vertical Offset"),
      "",
      { name: "divi/range", props: percentRange(-100) },
      isPlaced,
    ),
    // The zoom animation, with fields like Divi's own animation group (Advanced > Animation).
    animation: field(
      "animation",
      110,
      __("Animation"),
      __("Zooms the mask open, from its position. Available with Stretch to Fill and Custom Size."),
      {
        name: "divi/select",
        props: {
          options: { none: { label: __("None") }, zoom: { label: __("Zoom In") } },
        },
      },
      isZoomable,
      { defaultAttr: { desktop: { value: { animation: "none" } } } },
    ),
    animationTrigger: field(
      "animationTrigger",
      120,
      __("Animation Start"),
      "",
      {
        name: "divi/select",
        props: {
          options: {
            load: { label: __("On Page Load") },
            view: { label: __("When Scrolled Into View") },
          },
        },
      },
      isAnimated,
      { defaultAttr: { desktop: { value: { animationTrigger: "load" } } } },
    ),
    animationDuration: field(
      "animationDuration",
      130,
      __("Animation Duration"),
      "",
      { name: "divi/range", props: { defaultUnit: "ms", min: 0, minLimit: 0, max: 2000, step: 50 } },
      isAnimated,
      { defaultAttr: { desktop: { value: { animationDuration: "500ms" } } } },
    ),
    animationDelay: field(
      "animationDelay",
      140,
      __("Animation Delay"),
      "",
      { name: "divi/range", props: { defaultUnit: "ms", min: 0, minLimit: 0, max: 2000, step: 50 } },
      isAnimated,
      { defaultAttr: { desktop: { value: { animationDelay: "0ms" } } } },
    ),
    animationEasing: field(
      "animationEasing",
      150,
      __("Animation Speed Curve"),
      "",
      {
        name: "divi/select",
        props: {
          options: {
            ease: { label: __("Ease") },
            "ease-in-out": { label: __("Ease-In-Out") },
            "ease-in": { label: __("Ease-In") },
            "ease-out": { label: __("Ease-Out") },
            linear: { label: __("Linear") },
          },
        },
      },
      isAnimated,
      { defaultAttr: { desktop: { value: { animationEasing: "ease" } } } },
    ),
    animationRepeat: field(
      "animationRepeat",
      160,
      __("Animation Repeat"),
      "",
      { name: "divi/select", props: { options: repeatOptions } },
      isAnimated,
      {
        defaultAttr: { desktop: { value: { animationRepeat: "once" } } },
        // "Every time in view" only with the view start. (The props Divi passes in carry no options to filter.)
        filterComponentProps: (props) => {
          if (maskOf(props.attrs).animationTrigger === "view") {
            return { ...props, options: repeatOptions };
          }
          const { view, ...options } = repeatOptions;
          return { ...props, options };
        },
      },
    ),
  };

  hooks.addFilter(
    "divi.moduleLibrary.moduleAttributes.divi.image",
    "divi5ImageMask",
    (attributes) => ({
      ...attributes,
      image: {
        ...attributes.image,
        settings: {
          ...attributes.image?.settings,
          advanced: {
            ...attributes.image?.settings?.advanced,
            mask: { groupType: "group-items", items },
          },
        },
      },
    }),
  );

  hooks.addFilter(
    "divi.moduleLibrary.moduleSettings.groups.divi.image",
    "divi5ImageMask",
    (groups) => ({
      ...groups,
      [GROUP]: {
        panel: "design",
        priority: 20,
        groupName: GROUP,
        component: {
          name: "divi/composite",
          props: { groupLabel: __("Image Mask") },
        },
      },
    }),
  );

  // Preview: the builder renders the module itself, without the plugin's PHP, so one stylesheet in the app window
  // carries a rule per masked module, rebuilt from Divi's store whenever the store or the page changes.
  const sheet = document.createElement("style");
  sheet.id = "d5im-preview";
  document.head.append(sheet);

  // The zoom plays like "On Page Load" (the page's keyframes, see D5IM_ANIMATION_CSS), whatever the start setting,
  // and again whenever a module's mask settings change.
  const KEYFRAMES = "@keyframes d5im-zoom{from{mask-size:0 0}}";
  const lastSettings = new Map(); // Module id => its rules, to see which changed.

  let queued = false;
  const syncPreview = () => {
    queued = false;
    const store = window.divi?.data?.select("divi/edit-post");
    if (!store) {
      return;
    }
    const rules = [KEYFRAMES];
    const changed = [];
    let waiting = false;
    document.querySelectorAll(".et_pb_image").forEach((moduleEl) => {
      const id = moduleEl.className.match(/et_pb_image_([0-9a-f-]{36})/)?.[1];
      const mask = id
        ? (store.getModuleAttr(id, "image.advanced.mask")?.desktop?.value ?? {})
        : {};
      const css = id ? maskCss(mask) : "";
      waiting ||= css === null;
      if (!css) {
        return;
      }
      const selector = `.et_pb_image_${id} .et_pb_image_wrap`;
      let rule = `${selector}{${css}}`;
      const animation = animationCss(mask);
      if (animation) {
        rule += `@media (prefers-reduced-motion:no-preference){${selector}{animation:${animation}}}`;
        if (lastSettings.get(id) !== rule) {
          changed.push(moduleEl);
        }
      }
      lastSettings.set(id, rule);
      rules.push(rule);
    });
    // Divi's mask bundle arrives without a store change or new elements to wake us up.
    if (waiting) {
      setTimeout(schedule, 250);
    }
    const text = rules.join("\n");
    // Unchanged text is not written again, so the observer below doesn't loop on our own change.
    if (sheet.textContent !== text) {
      sheet.textContent = text;
    }
    // Restart the zoom of modules whose settings changed (a changed duration alone wouldn't restart it).
    changed.forEach((moduleEl) =>
      moduleEl
        .querySelector(".et_pb_image_wrap")
        ?.getAnimations()
        .forEach((a) => {
          a.cancel();
          a.play();
        }),
    );
  };
  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(syncPreview);
    }
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.divi?.data?.subscribe?.(schedule);
})();
