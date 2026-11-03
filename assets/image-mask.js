// Visual Builder: a "Bildmaske" group on Divi 5's Image module (Design tab), modelled on Divi's Background > Mask
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

    // Inverting a custom mask: subtract it from a full layer.
    if (custom && invert) {
      layers.push("linear-gradient(#000 0 0)");
      sizes.push("100% 100%");
      positions.push("0 0");
      composite = "mask-composite:exclude;";
    }

    return `mask-image:${layers.join(",")};mask-size:${sizes.join(",")};mask-position:${positions.join(",")};mask-repeat:no-repeat;${composite}`;
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
  const transformOptions = {
    flipHorizontal: {
      icon: "divi/flip-horizontal",
      label: "Horizontal spiegeln",
    },
    flipVertical: { icon: "divi/flip-vertical", label: "Vertikal spiegeln" },
    rotate: { icon: "divi/transform-rotate", label: "Um 90° drehen" },
    invert: { icon: "divi/transform-invert", label: "Umkehren" },
  };

  const items = {
    style: field(
      "style",
      10,
      "Maskenform",
      "Eine von Divis Maskenformen. Das Bild bleibt sichtbar, wo ein Divi-Hintergrund durch dieselbe Maske scheint.",
      { name: "divi/select-mask", props: { hasPreview: false } },
    ),
    custom: field(
      "custom",
      20,
      "Eigene Maske",
      "Ein SVG oder PNG statt der Maskenform. Das Bild bleibt sichtbar, wo die Maske deckend ist.",
      { name: "divi/upload" },
    ),
    transform: field(
      "transform",
      30,
      "Transformation",
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
      "Seitenverhältnis",
      "",
      {
        name: "divi/button-options",
        props: {
          options: {
            landscape: {
              icon: "divi/aspect-ratio-landscape",
              label: "Querformat",
            },
            square: { icon: "divi/aspect-ratio-square", label: "Quadratisch" },
            portrait: {
              icon: "divi/aspect-ratio-portrait",
              label: "Hochformat",
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
      "Größe",
      "",
      {
        name: "divi/select",
        props: {
          options: {
            stretch: { label: "Strecken" },
            cover: { label: "Füllen" },
            contain: { label: "Einpassen" },
            custom: { label: "Eigene Größe" },
          },
        },
      },
      hasMask,
      { defaultAttr: { desktop: { value: { size: "stretch" } } } },
    ),
    width: field(
      "width",
      60,
      "Breite",
      "",
      { name: "divi/range", props: percentRange(0) },
      (mask) => hasMask(mask) && mask.size === "custom",
    ),
    height: field(
      "height",
      70,
      "Höhe",
      "",
      { name: "divi/range", props: percentRange(0) },
      (mask) => hasMask(mask) && mask.size === "custom",
    ),
    position: field(
      "position",
      80,
      "Position",
      "",
      {
        name: "divi/select",
        props: {
          options: {
            center: { label: "Mitte" },
            "top left": { label: "Oben links" },
            top: { label: "Oben" },
            "top right": { label: "Oben rechts" },
            right: { label: "Rechts" },
            "bottom right": { label: "Unten rechts" },
            bottom: { label: "Unten" },
            "bottom left": { label: "Unten links" },
            left: { label: "Links" },
          },
        },
      },
      isPlaced,
      { defaultAttr: { desktop: { value: { position: "center" } } } },
    ),
    horizontalOffset: field(
      "horizontalOffset",
      90,
      "Horizontaler Versatz",
      "",
      { name: "divi/range", props: percentRange(-100) },
      isPlaced,
    ),
    verticalOffset: field(
      "verticalOffset",
      100,
      "Vertikaler Versatz",
      "",
      { name: "divi/range", props: percentRange(-100) },
      isPlaced,
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
          props: { groupLabel: "Bildmaske" },
        },
      },
    }),
  );

  // Preview: the builder renders the module itself, without the plugin's PHP, so one stylesheet in the app window
  // carries a rule per masked module, rebuilt from Divi's store whenever the store or the page changes.
  const sheet = document.createElement("style");
  sheet.id = "d5im-preview";
  document.head.append(sheet);

  let queued = false;
  const syncPreview = () => {
    queued = false;
    const store = window.divi?.data?.select("divi/edit-post");
    if (!store) {
      return;
    }
    const rules = [];
    let waiting = false;
    document.querySelectorAll(".et_pb_image").forEach((moduleEl) => {
      const id = moduleEl.className.match(/et_pb_image_([0-9a-f-]{36})/)?.[1];
      const css = id
        ? maskCss(
            store.getModuleAttr(id, "image.advanced.mask")?.desktop?.value ??
              {},
          )
        : "";
      waiting ||= css === null;
      if (css) {
        rules.push(`.et_pb_image_${id} .et_pb_image_wrap{${css}}`);
      }
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
