(() => {
  "use strict";

  const PROFILE_DEFAULTS = {
    micro: {
      heightDiameterRatio: 2,
      impellerType: "pitched",
      impellerCount: 1,
      powerNumber: 1.3,
      baseRpm: 800,
      maxRpm: 3000,
      baseVvm: 0.3,
      maxVvm: 1,
      baffled: false,
      maxPressure: 0.2,
      operatingPressure: 0
    },
    microfluidic: {
      heightDiameterRatio: 2,
      impellerType: "marine",
      impellerCount: 1,
      powerNumber: 0.1,
      baseRpm: 100,
      maxRpm: 500,
      baseVvm: 0.05,
      maxVvm: 0.2,
      baffled: false,
      maxPressure: 0.2,
      operatingPressure: 0
    },
    rocking: {
      heightDiameterRatio: 0.7,
      impellerType: "marine",
      impellerCount: 1,
      powerNumber: 0.15,
      baseRpm: 20,
      maxRpm: 40,
      baseVvm: 0.05,
      maxVvm: 0.5,
      baffled: false,
      maxPressure: 0.1,
      operatingPressure: 0
    },
    glass: {
      heightDiameterRatio: 2.2,
      impellerType: "pitched",
      impellerCount: 2,
      powerNumber: 1.3,
      baseRpm: 350,
      maxRpm: 1200,
      baseVvm: 0.3,
      maxVvm: 2,
      baffled: true,
      maxPressure: 0.5,
      operatingPressure: 0
    },
    microbial: {
      heightDiameterRatio: 3,
      impellerType: "rushton",
      impellerCount: 3,
      powerNumber: 5,
      baseRpm: 250,
      maxRpm: 600,
      baseVvm: 0.5,
      maxVvm: 2,
      baffled: true,
      maxPressure: 0.5,
      operatingPressure: 0.1
    },
    "steel-microbial": {
      heightDiameterRatio: 3,
      impellerType: "rushton",
      impellerCount: 3,
      powerNumber: 5,
      baseRpm: 180,
      maxRpm: 500,
      baseVvm: 0.5,
      maxVvm: 2,
      baffled: true,
      maxPressure: 1,
      operatingPressure: 0.2
    },
    mammalian: {
      heightDiameterRatio: 2,
      impellerType: "hydrofoil",
      impellerCount: 2,
      powerNumber: 0.4,
      baseRpm: 100,
      maxRpm: 250,
      baseVvm: 0.05,
      maxVvm: 0.3,
      baffled: false,
      maxPressure: 0.5,
      operatingPressure: 0.05
    }
  };

  const PROFILE_NAMES = {
    micro: "microbioreactor",
    microfluidic: "microfluidic",
    rocking: "rocking-bag",
    glass: "reusable glass",
    microbial: "microbial stirred-tank",
    "steel-microbial": "reusable steel microbial",
    mammalian: "mammalian stirred-tank"
  };

  const PARAMETER_LABELS = {
    workingRange: "Working-volume range",
    minVolume: "Minimum working volume",
    maxVolume: "Maximum working volume",
    nominalVolume: "Nominal vessel / bag size",
    totalVolume: "Total vessel volume loaded into the form",
    initialVolume: "Initial working volume loaded into the form",
    material: "Product-contact material",
    heightDiameterRatio: "Height : diameter",
    vesselDiameter: "Estimated internal diameter",
    liquidHeight: "Estimated liquid height",
    impellerType: "Impeller / mixing type",
    impellerCount: "Impeller count",
    impellerDiameter: "Estimated impeller diameter",
    powerNumber: "Power number",
    baseRpm: "Initial agitation",
    maxRpm: "Maximum agitation",
    baseVvm: "Initial aeration",
    maxVvm: "Maximum aeration",
    baffled: "Baffled vessel",
    maxPressure: "Maximum pressure",
    operatingPressure: "Default operating pressure",
    maxOxygenFraction: "Maximum inlet oxygen fraction"
  };

  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const isCustom = (record) => record?.manufacturer === "Custom";
  const isMinimumDerived = (record) => /derived|estimated|approximate|inherited|mixed/i.test(String(record?.status || ""));

  const formatInputNumber = (value) => {
    if (!Number.isFinite(value)) return "—";
    if (Math.abs(value) < 0.01) return String(Number(value.toFixed(6)));
    if (Math.abs(value) < 1) return String(Number(value.toFixed(4)));
    return String(Number(value.toFixed(2)));
  };

  const formatNumber = (value, significantDigits = 7) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return String(Number(number.toPrecision(significantDigits)));
  };

  const formatVolume = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (number < 0.001) return `${formatNumber(number * 1_000_000)} µL`;
    if (number < 1) return `${formatNumber(number * 1000)} mL`;
    return `${formatNumber(number)} L`;
  };

  const formatPercent = (value) => `${formatNumber(value, 5)}%`;
  const displayImpellerType = (value) => ({
    pitched: "Pitched-blade turbine",
    rushton: "Six-blade Rushton turbine",
    marine: "Marine / placeholder mixing element",
    hydrofoil: "Hydrofoil"
  }[value] || String(value || "—"));

  const geometryFor = (record) => {
    const maxVolume = Math.max(Number(record?.maxVolume) || 0, 0.001);
    const ratio = Math.max(Number(record?.defaults?.heightDiameterRatio) || 2, 0.5);
    const volumeM3 = maxVolume / 1000;
    const diameter = Math.cbrt((4 * volumeM3) / (Math.PI * ratio));
    const liquidHeight = diameter * ratio;
    const impellerDiameter = Math.max(diameter * 0.33, 0.001);
    return {
      maxVolume,
      ratio,
      volumeM3,
      diameter,
      liquidHeight,
      impellerDiameter,
      totalVolume: Math.max(Number(record?.nominalVolume) || 0, maxVolume),
      initialVolume: Math.min(Number(record?.minVolume) || 0, maxVolume)
    };
  };

  const valueFor = (record, key) => {
    const geometry = geometryFor(record);
    switch (key) {
      case "workingRange": return [record.minVolume, record.maxVolume];
      case "minVolume": return Number(record.minVolume);
      case "maxVolume": return Number(record.maxVolume);
      case "nominalVolume": return Number(record.nominalVolume);
      case "totalVolume": return geometry.totalVolume;
      case "initialVolume": return geometry.initialVolume;
      case "material": return record.material;
      case "vesselDiameter": return geometry.diameter;
      case "liquidHeight": return geometry.liquidHeight;
      case "impellerDiameter": return geometry.impellerDiameter;
      case "maxOxygenFraction": return 100;
      default: return record.defaults?.[key];
    }
  };

  const displayValue = (record, key) => {
    const value = valueFor(record, key);
    switch (key) {
      case "workingRange": return `${formatVolume(value[0])} to ${formatVolume(value[1])}`;
      case "minVolume":
      case "maxVolume":
      case "nominalVolume":
      case "totalVolume":
      case "initialVolume": return formatVolume(value);
      case "material": return String(value || "—");
      case "vesselDiameter":
      case "liquidHeight":
      case "impellerDiameter": return `${formatInputNumber(Number(value))} m`;
      case "heightDiameterRatio":
      case "impellerCount":
      case "powerNumber": return formatNumber(Number(value));
      case "impellerType": return displayImpellerType(value);
      case "baseRpm":
      case "maxRpm": return `${formatNumber(Number(value))} rpm`;
      case "baseVvm":
      case "maxVvm": return `${formatNumber(Number(value))} vvm`;
      case "baffled": return value ? "Yes" : "No";
      case "maxPressure":
      case "operatingPressure": return `${formatNumber(Number(value))} bar(g)`;
      case "maxOxygenFraction": return "100%";
      default: return String(value ?? "—");
    }
  };

  const statusFor = (record, key) => {
    if (isCustom(record)) return "Custom template";
    if (key === "workingRange") return isMinimumDerived(record) ? "Derived / estimated" : "Source-supported";
    if (record?.sourceSupportedFields?.includes(key)) return "Source-supported";
    if (["material", "maxVolume", "nominalVolume"].includes(key)) return "Source-supported";
    if (key === "minVolume") return isMinimumDerived(record) ? "Derived / estimated" : "Source-supported";
    if (["totalVolume", "initialVolume", "vesselDiameter", "liquidHeight", "impellerDiameter"].includes(key)) {
      return "Derived / estimated";
    }
    return "App assumption";
  };

  const statusClass = (status) => {
    if (status === "Source-supported") return "source-supported";
    if (status === "Derived / estimated") return "source-derived";
    if (status === "Custom template") return "source-custom";
    return "source-assumption";
  };

  const profileOrigin = (record, key) => {
    const profile = record.profile || "mammalian";
    const profileName = PROFILE_NAMES[profile] || profile;

    if (hasOwn(record, key)) {
      return {
        origin: "Vessel-specific preset override",
        rule: `${key} = ${JSON.stringify(record[key])}`,
        calculation: "No calculation. The value is written directly into this vessel's catalogue entry.",
        result: displayValue(record, key),
        rationale: `This vessel-specific value overrides the generic ${profileName} profile. It is still treated as an app assumption unless the parameter is explicitly listed as source-supported.`
      };
    }

    if (profile === "mammalian" && record.maxVolume > 50) {
      if (key === "baseRpm") {
        const condition = record.maxVolume >= 1000;
        return {
          origin: "Large mammalian-vessel scaling rule",
          rule: "baseRpm = maxVolume >= 1000 L ? 55 : 80",
          calculation: `${formatVolume(record.maxVolume)} ${condition ? "is" : "is not"} at least 1000 L → ${condition ? 55 : 80} rpm`,
          result: displayValue(record, key),
          rationale: "The simulator lowers its generic starting agitation at larger scale. This is an internal scale heuristic, not a manufacturer limit."
        };
      }
      if (key === "maxRpm") {
        const condition = record.maxVolume >= 1000;
        return {
          origin: "Large mammalian-vessel scaling rule",
          rule: "maxRpm = maxVolume >= 1000 L ? 150 : 200",
          calculation: `${formatVolume(record.maxVolume)} ${condition ? "is" : "is not"} at least 1000 L → ${condition ? 150 : 200} rpm`,
          result: displayValue(record, key),
          rationale: "The simulator lowers its generic agitation ceiling at larger scale. This is an internal scale heuristic, not a manufacturer limit."
        };
      }
      if (key === "impellerCount") {
        const condition = record.maxVolume >= 1000;
        return {
          origin: "Large mammalian-vessel scaling rule",
          rule: "impellerCount = maxVolume >= 1000 L ? 3 : 2",
          calculation: `${formatVolume(record.maxVolume)} ${condition ? "is" : "is not"} at least 1000 L → ${condition ? 3 : 2} impellers`,
          result: displayValue(record, key),
          rationale: "The simulator adds a third generic impeller at 1000 L and above. This is an internal geometry heuristic, not a manufacturer configuration."
        };
      }
    }

    if ((profile === "microbial" || profile === "steel-microbial") && record.maxVolume > 50) {
      if (key === "baseRpm") {
        const condition = record.maxVolume >= 500;
        return {
          origin: "Large microbial-vessel scaling rule",
          rule: "baseRpm = maxVolume >= 500 L ? 80 : 140",
          calculation: `${formatVolume(record.maxVolume)} ${condition ? "is" : "is not"} at least 500 L → ${condition ? 80 : 140} rpm`,
          result: displayValue(record, key),
          rationale: "The simulator lowers starting agitation with increasing microbial vessel scale. This is an internal scale heuristic, not a manufacturer limit."
        };
      }
      if (key === "maxRpm") {
        const condition = record.maxVolume >= 500;
        return {
          origin: "Large microbial-vessel scaling rule",
          rule: "maxRpm = maxVolume >= 500 L ? 250 : 400",
          calculation: `${formatVolume(record.maxVolume)} ${condition ? "is" : "is not"} at least 500 L → ${condition ? 250 : 400} rpm`,
          result: displayValue(record, key),
          rationale: "The simulator lowers its generic agitation ceiling with increasing microbial vessel scale. This is an internal scale heuristic, not a manufacturer limit."
        };
      }
    }

    const profileValue = PROFILE_DEFAULTS[profile]?.[key];
    return {
      origin: `Generic ${profileName} profile`,
      rule: `PROFILE_DEFAULTS[${JSON.stringify(profile)}].${key} = ${JSON.stringify(profileValue)}`,
      calculation: "No calculation. The vessel inherits this literal value from its generic profile.",
      result: displayValue(record, key),
      rationale: `No model-specific value is stored for this parameter, so the simulator uses its editable ${profileName} starting profile.`
    };
  };

  const caveatFor = (record, key) => {
    if (record.profile === "rocking" && ["heightDiameterRatio", "impellerType", "impellerCount", "powerNumber", "baseRpm", "maxRpm"].includes(key)) {
      return "This is a rocking-bag system. These stirred-tank fields are compatibility placeholders for the current simulation engine and should not be interpreted as physical impeller specifications.";
    }
    if (record.profile === "microfluidic" && ["heightDiameterRatio", "impellerType", "impellerCount", "powerNumber", "baseRpm", "maxRpm"].includes(key)) {
      return "This is a microfluidic system. These stirred-tank fields are compatibility placeholders for the current simulation engine and should not be interpreted as physical impeller specifications.";
    }
    return "";
  };

  const explainMinimum = (record) => {
    const min = Number(record.minVolume);
    const max = Number(record.maxVolume);
    const nominal = Number(record.nominalVolume);
    const basis = String(record.volumeBasis || "");
    const ratio = min > 0 ? max / min : NaN;
    const percentOfNominal = nominal > 0 ? (min / nominal) * 100 : NaN;

    if (/5:1|divided by five/i.test(`${record.status} ${basis}`)) {
      return {
        origin: "Published 5:1 platform turndown applied to the named scale",
        rule: "minimum working volume = nominal vessel volume ÷ 5",
        inputs: [
          ["Nominal vessel volume", formatVolume(nominal)],
          ["Turndown ratio", "5:1"]
        ],
        calculation: `${formatVolume(nominal)} ÷ 5 = ${formatVolume(nominal / 5)}`,
        result: formatVolume(min),
        rationale: basis
      };
    }

    if (/20%/i.test(basis)) {
      return {
        origin: "Family-level 20% minimum rule",
        rule: "minimum working volume = maximum working volume × 0.20",
        inputs: [
          ["Maximum working volume", formatVolume(max)],
          ["Minimum fraction", "20%"]
        ],
        calculation: `${formatVolume(max)} × 0.20 = ${formatVolume(max * 0.20)}`,
        result: formatVolume(min),
        rationale: basis
      };
    }

    if (/bag-specific working ranges|subdivisions/i.test(`${record.status} ${basis}`)) {
      return {
        origin: "Approximate bag-specific subdivision of the rocker operating envelope",
        rule: "maximum working volume = nominal bag volume ÷ 2; minimum working volume = nominal bag volume ÷ 10",
        inputs: [["Nominal bag volume", formatVolume(nominal)]],
        calculation: `${formatVolume(nominal)} ÷ 2 = ${formatVolume(nominal / 2)} maximum; ${formatVolume(nominal)} ÷ 10 = ${formatVolume(nominal / 10)} minimum`,
        result: `${formatVolume(min)} to ${formatVolume(max)}`,
        rationale: basis
      };
    }

    if (/turndown|inherited/i.test(`${record.status} ${basis}`) && Number.isFinite(ratio)) {
      const roundedRatio = Math.round(ratio * 100) / 100;
      return {
        origin: "Inferred family turndown pattern",
        rule: `minimum working volume = maximum working volume ÷ ${formatNumber(roundedRatio)}`,
        inputs: [
          ["Maximum working volume", formatVolume(max)],
          ["Inferred turndown", `${formatNumber(roundedRatio)}:1`]
        ],
        calculation: `${formatVolume(max)} ÷ ${formatNumber(roundedRatio)} = ${formatVolume(max / roundedRatio)}`,
        result: formatVolume(min),
        rationale: basis
      };
    }

    return {
      origin: "Manual engineering estimate stored in the vessel catalogue",
      rule: `minVolume = ${formatNumber(min)} L`,
      inputs: [
        ["Nominal vessel volume", formatVolume(nominal)],
        ["Selected minimum", formatVolume(min)]
      ],
      calculation: Number.isFinite(percentOfNominal)
        ? `${formatVolume(min)} is ${formatPercent(percentOfNominal)} of the ${formatVolume(nominal)} nominal vessel volume.`
        : "No numerical formula is encoded for this estimate.",
      result: formatVolume(min),
      rationale: `${basis} No further calculation rule is encoded; this is an explicit manual preset assumption.`
    };
  };

  const explain = (record, key) => {
    const status = statusFor(record, key);
    const label = PARAMETER_LABELS[key] || key;
    const geometry = geometryFor(record);
    const common = {
      title: `How ${label.toLowerCase()} was obtained`,
      status,
      verification: status === "Source-supported"
        ? "Treated as supported by the cited manufacturer record."
        : status === "Custom template"
          ? "A user-editable custom-template value; no manufacturer verification applies."
          : "Not manufacturer-confirmed. Change the value or replace it with a verified specification when available."
    };

    if (key === "workingRange") {
      if (!isMinimumDerived(record)) {
        return {
          ...common,
          origin: "Manufacturer source record",
          rule: "The minimum and maximum are copied from the recorded source range.",
          calculation: "No app calculation.",
          result: displayValue(record, key),
          rationale: record.volumeBasis,
          inputs: []
        };
      }
      const minExplanation = explainMinimum(record);
      return {
        ...common,
        ...minExplanation,
        title: "How the working-volume range was obtained",
        result: `${formatVolume(record.minVolume)} to ${formatVolume(record.maxVolume)}`,
        rationale: `${minExplanation.rationale} The maximum value is the recorded model scale; the minimum is the derived or estimated part of the range.`
      };
    }

    if (key === "minVolume") return { ...common, ...explainMinimum(record) };

    if (key === "totalVolume") {
      return {
        ...common,
        origin: "Form-population rule",
        rule: "total volume = max(nominal vessel volume, maximum working volume)",
        inputs: [
          ["Nominal vessel volume", formatVolume(record.nominalVolume)],
          ["Maximum working volume", formatVolume(record.maxVolume)]
        ],
        calculation: `max(${formatVolume(record.nominalVolume)}, ${formatVolume(record.maxVolume)}) = ${formatVolume(geometry.totalVolume)}`,
        result: displayValue(record, key),
        rationale: "This prevents the form's total vessel volume from being smaller than the working-volume ceiling."
      };
    }

    if (key === "initialVolume") {
      return {
        ...common,
        origin: "Form-population rule",
        rule: "initial working volume = min(minimum working volume, maximum working volume)",
        inputs: [
          ["Minimum working volume", formatVolume(record.minVolume)],
          ["Maximum working volume", formatVolume(record.maxVolume)]
        ],
        calculation: `min(${formatVolume(record.minVolume)}, ${formatVolume(record.maxVolume)}) = ${formatVolume(geometry.initialVolume)}`,
        result: displayValue(record, key),
        rationale: "The preset starts the process at the lower end of its configured working range."
      };
    }

    if (key === "vesselDiameter") {
      return {
        ...common,
        origin: "Cylindrical geometry estimate",
        rule: "D = ∛[(4 × V)/(π × H:D)]",
        inputs: [
          ["Maximum working volume", `${formatVolume(geometry.maxVolume)} = ${formatNumber(geometry.volumeM3)} m³`],
          ["Height : diameter ratio", formatNumber(geometry.ratio)]
        ],
        calculation: `D = ∛[(4 × ${formatNumber(geometry.volumeM3)} m³)/(π × ${formatNumber(geometry.ratio)})] = ${formatNumber(geometry.diameter)} m; the form displays ${formatInputNumber(geometry.diameter)} m.`,
        result: displayValue(record, key),
        rationale: "The estimate treats the liquid volume as a straight-sided cylinder and does not include heads, cones, internals or manufacturer-specific dimensions."
      };
    }

    if (key === "liquidHeight") {
      return {
        ...common,
        origin: "Cylindrical geometry estimate",
        rule: "liquid height = estimated internal diameter × H:D",
        inputs: [
          ["Estimated internal diameter", `${formatNumber(geometry.diameter)} m`],
          ["Height : diameter ratio", formatNumber(geometry.ratio)]
        ],
        calculation: `${formatNumber(geometry.diameter)} m × ${formatNumber(geometry.ratio)} = ${formatNumber(geometry.liquidHeight)} m; the form displays ${formatInputNumber(geometry.liquidHeight)} m.`,
        result: displayValue(record, key),
        rationale: "This is linked to the same ideal-cylinder approximation used for the diameter."
      };
    }

    if (key === "impellerDiameter") {
      return {
        ...common,
        origin: "Generic impeller-to-tank ratio",
        rule: "impeller diameter = max(0.33 × estimated vessel diameter, 0.001 m)",
        inputs: [
          ["Estimated vessel diameter", `${formatNumber(geometry.diameter)} m`],
          ["Generic Dᵢ/D ratio", "0.33"],
          ["Minimum permitted form value", "0.001 m"]
        ],
        calculation: `max(0.33 × ${formatNumber(geometry.diameter)} m, 0.001 m) = ${formatNumber(geometry.impellerDiameter)} m; the form displays ${formatInputNumber(geometry.impellerDiameter)} m.`,
        result: displayValue(record, key),
        rationale: "A one-third tank-diameter impeller is used only as a generic starting geometry when no model-specific impeller diameter is stored."
      };
    }

    if (key === "maxOxygenFraction") {
      return {
        ...common,
        origin: "Fixed simulator capability assumption",
        rule: "maxOxygenFraction = 100",
        inputs: [],
        calculation: "No calculation. Every vessel preset currently permits a 100% oxygen inlet ceiling in the generic gas cascade.",
        result: "100%",
        rationale: "This describes the simulator's permitted gas-mixture range, not proof that the selected hardware is certified for pure oxygen service."
      };
    }

    if (["maxVolume", "nominalVolume", "material"].includes(key) || record.sourceSupportedFields?.includes(key)) {
      return {
        ...common,
        origin: "Manufacturer source record",
        rule: "Copied into the local preset record from the cited source.",
        inputs: [],
        calculation: "No app calculation.",
        result: displayValue(record, key),
        rationale: key === "material" ? record.materialBasis : record.volumeBasis
      };
    }

    const origin = profileOrigin(record, key);
    const caveat = caveatFor(record, key);
    const rationaleByKey = {
      heightDiameterRatio: "This ratio is subsequently used to estimate vessel diameter and liquid height.",
      impellerType: "The selected type determines the generic mixing archetype shown and is paired with the preset power-number assumption.",
      impellerCount: "The count is used by the vessel diagram and represents a generic configuration unless source-supported.",
      powerNumber: "The power number is an empirical generic value used in P = Np·ρ·N³·Dᵢ⁵. It is not recalculated from blade geometry.",
      baseRpm: "This is the initial agitation setting loaded into the form.",
      maxRpm: "This is the ceiling available to the generic DO-control cascade.",
      baseVvm: "This is the initial gas rate loaded into the form.",
      maxVvm: "This is the gas-rate ceiling available to the generic DO-control cascade.",
      baffled: "This Boolean changes the generic vessel configuration and mixing interpretation.",
      maxPressure: "This is the pressure ceiling used for warnings in the generic equipment model.",
      operatingPressure: "This is the starting headspace pressure loaded into the form."
    };

    return {
      ...common,
      ...origin,
      inputs: [
        ["Vessel profile", `${record.profile} (${PROFILE_NAMES[record.profile] || record.profile})`],
        ["Maximum working volume", formatVolume(record.maxVolume)]
      ],
      rationale: [origin.rationale, rationaleByKey[key], caveat].filter(Boolean).join(" ")
    };
  };

  const shortBasis = (record, key) => {
    const status = statusFor(record, key);
    if (key === "workingRange" || key === "minVolume" || key === "maxVolume") return record.volumeBasis;
    if (key === "nominalVolume") return "Named vessel or bag scale recorded for this model.";
    if (key === "material") return record.materialBasis;
    if (key === "totalVolume") return "Calculated as the larger of nominal volume and maximum working volume.";
    if (key === "initialVolume") return "Set to the lower end of the configured working range.";
    if (key === "vesselDiameter") return "Ideal-cylinder estimate from maximum working volume and H:D.";
    if (key === "liquidHeight") return "Estimated diameter multiplied by H:D.";
    if (key === "impellerDiameter") return "Generic 0.33 × tank-diameter estimate.";
    if (key === "maxOxygenFraction") return "Fixed gas-cascade capability assumption.";
    if (status === "Source-supported") return "Explicitly identified as supported by the selected manufacturer source.";
    const origin = profileOrigin(record, key);
    return origin.origin;
  };

  const parameter = (record, key, label = PARAMETER_LABELS[key]) => ({
    key,
    label,
    value: displayValue(record, key),
    basis: shortBasis(record, key),
    status: statusFor(record, key),
    explanation: explain(record, key)
  });

  const coreParameters = (record) => [
    parameter(record, "workingRange"),
    parameter(record, "nominalVolume"),
    parameter(record, "material")
  ];

  const allParameters = (record) => [
    parameter(record, "minVolume"),
    parameter(record, "maxVolume"),
    parameter(record, "nominalVolume"),
    parameter(record, "totalVolume"),
    parameter(record, "initialVolume"),
    parameter(record, "material"),
    parameter(record, "heightDiameterRatio"),
    parameter(record, "vesselDiameter"),
    parameter(record, "liquidHeight"),
    parameter(record, "impellerType"),
    parameter(record, "impellerCount"),
    parameter(record, "impellerDiameter"),
    parameter(record, "powerNumber"),
    parameter(record, "baseRpm"),
    parameter(record, "maxRpm"),
    parameter(record, "baseVvm"),
    parameter(record, "maxVvm"),
    parameter(record, "baffled"),
    parameter(record, "maxPressure"),
    parameter(record, "operatingPressure"),
    parameter(record, "maxOxygenFraction")
  ];

  window.FermentationSourceDerivations = Object.freeze({
    PROFILE_DEFAULTS,
    PARAMETER_LABELS,
    allParameters,
    coreParameters,
    displayValue,
    explain,
    formatInputNumber,
    formatNumber,
    formatVolume,
    geometryFor,
    isCustom,
    statusClass,
    statusFor,
    valueFor
  });
})();
