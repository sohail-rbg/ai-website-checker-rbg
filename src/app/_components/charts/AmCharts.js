"use client";

import { useEffect, useRef } from "react";

function disposeLogo(root) {
  if (root?._logo) root._logo.dispose();
}

export function AmScoreRing({ score, color = "#90ee9a", className = "size-14" }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return undefined;

    let root;
    let cancelled = false;

    async function renderChart() {
      const [am5, am5percent, am5themesAnimated] = await Promise.all([
        import("@amcharts/amcharts5"),
        import("@amcharts/amcharts5/percent"),
        import("@amcharts/amcharts5/themes/Animated"),
      ]);

      if (cancelled || !chartRef.current) return;

      root = am5.Root.new(chartRef.current);
      root.setThemes([am5themesAnimated.default.new(root)]);
      disposeLogo(root);

      const chart = root.container.children.push(am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(76),
        radius: am5.percent(100),
      }));

      const series = chart.series.push(am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "category",
        alignLabels: false,
      }));

      series.labels.template.set("forceHidden", true);
      series.ticks.template.set("forceHidden", true);
      series.slices.template.setAll({
        strokeOpacity: 0,
        tooltipText: "",
      });
      series.slices.template.adapters.add("fill", (_fill, target) => {
        const category = target.dataItem?.dataContext?.category;
        return am5.color(category === "score" ? color : 0x17201d);
      });
      series.slices.template.adapters.add("fillOpacity", (_opacity, target) => {
        const category = target.dataItem?.dataContext?.category;
        return category === "score" ? 1 : 0.9;
      });

      series.data.setAll([
        { category: "score", value: Math.max(0, Math.min(100, Number(score) || 0)) },
        { category: "remaining", value: Math.max(0, 100 - (Number(score) || 0)) },
      ]);
      series.appear(600, 80);
    }

    renderChart();

    return () => {
      cancelled = true;
      if (root) root.dispose();
    };
  }, [score, color]);

  return <div ref={chartRef} className={className} aria-hidden="true" />;
}

export function AmOverallScoreChart({ score, data, className = "size-56" }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return undefined;

    let root;
    let cancelled = false;

    async function renderChart() {
      const [am5, am5percent, am5themesAnimated] = await Promise.all([
        import("@amcharts/amcharts5"),
        import("@amcharts/amcharts5/percent"),
        import("@amcharts/amcharts5/themes/Animated"),
      ]);

      if (cancelled || !chartRef.current) return;

      root = am5.Root.new(chartRef.current);
      root.setThemes([am5themesAnimated.default.new(root)]);
      root.interfaceColors.set("text", am5.color(0xd9e1d8));
      disposeLogo(root);

      const chart = root.container.children.push(am5percent.PieChart.new(root, {
        innerRadius: am5.percent(70),
        radius: am5.percent(100),
      }));

      const series = chart.series.push(am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "category",
        alignLabels: false,
      }));

      series.labels.template.set("forceHidden", true);
      series.ticks.template.set("forceHidden", true);
      series.slices.template.setAll({
        stroke: am5.color(0x020302),
        strokeWidth: 2,
        tooltipText: "",
        cursorOverStyle: "pointer",
      });
      series.slices.template.states.create("hover", {
        scale: 1.02,
        shiftRadius: 4,
      });
      series.slices.template.adapters.add("fill", (_fill, target) => {
        const context = target.dataItem?.dataContext;
        if (context?.category === "Opportunity") return am5.color(0x17201d);
        return am5.color(context?.color || 0x90ee9a);
      });
      series.slices.template.adapters.add("fillOpacity", (_opacity, target) => {
        const context = target.dataItem?.dataContext;
        return context?.category === "Opportunity" ? 0.86 : 0.96;
      });

      const chartData = [
        ...data.map((item, index) => ({
          ...item,
          index,
        })),
        {
          category: "Opportunity",
          value: Math.max(0, 100 - (Number(score) || 0)),
          index: data.length,
        },
      ].filter((item) => item.value > 0);

      series.data.setAll(chartData);
      series.appear(700, 90);
    }

    renderChart();

    return () => {
      cancelled = true;
      if (root) root.dispose();
    };
  }, [score, data]);

  return <div ref={chartRef} className={className} aria-hidden="true" />;
}

export function AmRadarChart({ data }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return undefined;

    let root;
    let cancelled = false;

    async function renderChart() {
      const [am5, am5radar, am5xy, am5themesAnimated] = await Promise.all([
        import("@amcharts/amcharts5"),
        import("@amcharts/amcharts5/radar"),
        import("@amcharts/amcharts5/xy"),
        import("@amcharts/amcharts5/themes/Animated"),
      ]);

      if (cancelled || !chartRef.current) return;

      root = am5.Root.new(chartRef.current);
      root.setThemes([am5themesAnimated.default.new(root)]);
      root.interfaceColors.set("text", am5.color(0xd9e1d8));
      disposeLogo(root);

      const chart = root.container.children.push(am5radar.RadarChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        startAngle: -90,
        endAngle: 270,
        innerRadius: am5.percent(18),
      }));

      const xRenderer = am5radar.AxisRendererCircular.new(root, {
        minGridDistance: 24,
        strokeOpacity: 0.14,
        stroke: am5.color(0x8b9c8c),
      });
      xRenderer.labels.template.setAll({
        fill: am5.color(0xd9e1d8),
        fontSize: 12,
        radius: 12,
      });
      xRenderer.grid.template.setAll({ stroke: am5.color(0x8b9c8c), strokeOpacity: 0.14 });

      const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
        categoryField: "name",
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {}),
      }));

      const yRenderer = am5radar.AxisRendererRadial.new(root, {
        minGridDistance: 18,
        strokeOpacity: 0.12,
        stroke: am5.color(0x8b9c8c),
      });
      yRenderer.labels.template.setAll({ fill: am5.color(0x8b9c8c), fontSize: 11 });
      yRenderer.grid.template.setAll({ stroke: am5.color(0x8b9c8c), strokeOpacity: 0.15 });

      const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
        min: 0,
        max: 100,
        strictMinMax: true,
        renderer: yRenderer,
      }));

      const series = chart.series.push(am5radar.RadarLineSeries.new(root, {
        name: "Score",
        xAxis,
        yAxis,
        valueYField: "value",
        categoryXField: "name",
        stroke: am5.color(0x90ee9a),
        fill: am5.color(0x2e5e53),
        tooltip: am5.Tooltip.new(root, {
          labelText: "{categoryX}: {valueY}/100",
        }),
      }));
      series.strokes.template.setAll({ strokeWidth: 3 });
      series.fills.template.setAll({ visible: true, fillOpacity: 0.28 });
      series.bullets.push(() => am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: 4,
          fill: am5.color(0x90ee9a),
          stroke: am5.color(0x020302),
          strokeWidth: 2,
        }),
      }));

      xAxis.data.setAll(data);
      series.data.setAll(data);
      series.appear(650);
      chart.appear(650, 80);
    }

    renderChart();

    return () => {
      cancelled = true;
      if (root) root.dispose();
    };
  }, [data]);

  return <div ref={chartRef} className="h-full min-h-80 w-full" />;
}

export function AmBarChart({ data }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return undefined;

    let root;
    let cancelled = false;

    async function renderChart() {
      const [am5, am5xy, am5themesAnimated] = await Promise.all([
        import("@amcharts/amcharts5"),
        import("@amcharts/amcharts5/xy"),
        import("@amcharts/amcharts5/themes/Animated"),
      ]);

      if (cancelled || !chartRef.current) return;

      root = am5.Root.new(chartRef.current);
      root.setThemes([am5themesAnimated.default.new(root)]);
      root.interfaceColors.set("text", am5.color(0xd9e1d8));
      disposeLogo(root);

      const chart = root.container.children.push(am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingLeft: 0,
        paddingRight: 10,
      }));

      const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 28 });
      xRenderer.labels.template.setAll({
        fill: am5.color(0xd9e1d8),
        fontSize: 11,
        rotation: -28,
        centerY: am5.p50,
        centerX: am5.p100,
        paddingRight: 8,
      });
      xRenderer.grid.template.setAll({ visible: false });

      const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
        categoryField: "name",
        renderer: xRenderer,
      }));

      const yRenderer = am5xy.AxisRendererY.new(root, {});
      yRenderer.labels.template.setAll({ fill: am5.color(0x8b9c8c), fontSize: 11 });
      yRenderer.grid.template.setAll({ stroke: am5.color(0x8b9c8c), strokeOpacity: 0.12 });

      const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
        min: 0,
        max: 100,
        strictMinMax: true,
        renderer: yRenderer,
      }));

      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        xAxis,
        yAxis,
        valueYField: "value",
        categoryXField: "name",
        tooltip: am5.Tooltip.new(root, {
          labelText: "{categoryX}: {valueY}/100",
        }),
      }));

      series.columns.template.setAll({
        cornerRadiusTL: 10,
        cornerRadiusTR: 10,
        fill: am5.color(0x90ee9a),
        stroke: am5.color(0x90ee9a),
        fillOpacity: 0.86,
        maxWidth: 46,
      });

      xAxis.data.setAll(data);
      series.data.setAll(data);
      series.appear(650);
      chart.appear(650, 80);
    }

    renderChart();

    return () => {
      cancelled = true;
      if (root) root.dispose();
    };
  }, [data]);

  return <div ref={chartRef} className="h-full min-h-80 w-full" />;
}

export function AmPriorityMatrix({ data }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return undefined;
    let root;
    let cancelled = false;

    async function renderChart() {
      const [am5, am5xy, am5themesAnimated] = await Promise.all([
        import("@amcharts/amcharts5"),
        import("@amcharts/amcharts5/xy"),
        import("@amcharts/amcharts5/themes/Animated"),
      ]);
      if (cancelled || !chartRef.current) return;

      root = am5.Root.new(chartRef.current);
      root.setThemes([am5themesAnimated.default.new(root)]);
      root.interfaceColors.set("text", am5.color(0xd9e1d8));
      disposeLogo(root);

      const chart = root.container.children.push(am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingLeft: 0,
        paddingRight: 12,
        paddingTop: 12,
      }));
      const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 50 });
      const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 40 });
      [xRenderer, yRenderer].forEach((renderer) => {
        renderer.labels.template.setAll({ fill: am5.color(0x8b9c8c), fontSize: 10 });
        renderer.grid.template.setAll({ stroke: am5.color(0x8b9c8c), strokeOpacity: 0.12 });
      });
      const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { min: 0, max: 100, strictMinMax: true, renderer: xRenderer, numberFormat: "#" }));
      const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: 0, max: 100, strictMinMax: true, renderer: yRenderer, numberFormat: "#" }));

      const midpointX = xAxis.createAxisRange(xAxis.makeDataItem({ value: 50 }));
      midpointX.get("grid").setAll({ stroke: am5.color(0x90ee9a), strokeOpacity: 0.28, strokeDasharray: [5, 5] });
      const midpointY = yAxis.createAxisRange(yAxis.makeDataItem({ value: 50 }));
      midpointY.get("grid").setAll({ stroke: am5.color(0x90ee9a), strokeOpacity: 0.28, strokeDasharray: [5, 5] });

      const series = chart.series.push(am5xy.LineSeries.new(root, {
        xAxis,
        yAxis,
        valueXField: "effort",
        valueYField: "impact",
        calculateAggregates: true,
        tooltip: am5.Tooltip.new(root, { labelText: "[bold]{name}[/]\nEffort: {effortLabel}\nEstimated impact: {impact}/100\nPotential lift: +{lift}\nState: {statusLabel}" }),
      }));
      series.strokes.template.setAll({ strokeOpacity: 0 });
      series.bullets.push((_root, _series, dataItem) => {
        const context = dataItem.dataContext;
        const container = am5.Container.new(root, { cursorOverStyle: "pointer" });
        const circle = container.children.push(am5.Circle.new(root, {
          radius: context.radius,
          fill: am5.color(context.color),
          fillOpacity: context.measured ? 0.88 : 0.3,
          stroke: am5.color(context.color),
          strokeWidth: 2,
          strokeOpacity: 0.95,
          tooltipText: series.get("tooltip").get("labelText"),
        }));
        circle.states.create("hover", { scale: 1.16, fillOpacity: 1 });
        container.children.push(am5.Label.new(root, {
          text: context.shortName,
          centerX: am5.p50,
          centerY: am5.p50,
          fill: am5.color(context.measured ? 0x020302 : 0xd9e1d8),
          fontSize: 9,
          fontWeight: "600",
          oversizedBehavior: "truncate",
          maxWidth: Math.max(34, context.radius * 1.7),
          textAlign: "center",
        }));
        container.setAll({ scale: 0, opacity: 0 });
        container.animate({ key: "scale", to: 1, duration: 650, easing: am5.ease.out(am5.ease.cubic) });
        container.animate({ key: "opacity", to: 1, duration: 450 });
        return am5.Bullet.new(root, { sprite: container });
      });
      series.data.setAll(data);
      series.appear(700, 120);
      chart.appear(700, 80);
    }

    renderChart();
    return () => {
      cancelled = true;
      if (root) root.dispose();
    };
  }, [data]);

  return (
    <div className="relative h-full min-h-80 w-full">
      <div className="pointer-events-none absolute inset-7 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-xl opacity-70">
        <div className="border-b border-r border-white/[.035] bg-[#90ee9a]/[.025] p-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#90ee9a]/45">Quick wins</div>
        <div className="border-b border-white/[.035] bg-sky-300/[.018] p-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/40">Strategic bets</div>
        <div className="border-r border-white/[.035] bg-white/[.012] p-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">Fill-ins</div>
        <div className="bg-amber-300/[.012] p-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/30">Reconsider</div>
      </div>
      <div ref={chartRef} className="relative z-10 h-full w-full" aria-label="Action priority matrix plotting implementation effort against estimated business impact" />
    </div>
  );
}

export function AmCheckStateChart({ data }) {
  const chartRef = useRef(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    if (!chartRef.current) return undefined;
    let root;
    let cancelled = false;
    async function renderChart() {
      const [am5, am5percent, am5themesAnimated] = await Promise.all([
        import("@amcharts/amcharts5"),
        import("@amcharts/amcharts5/percent"),
        import("@amcharts/amcharts5/themes/Animated"),
      ]);
      if (cancelled || !chartRef.current) return;
      root = am5.Root.new(chartRef.current);
      root.setThemes([am5themesAnimated.default.new(root)]);
      disposeLogo(root);
      const chart = root.container.children.push(am5percent.PieChart.new(root, { innerRadius: am5.percent(72), radius: am5.percent(92) }));
      const series = chart.series.push(am5percent.PieSeries.new(root, { valueField: "value", categoryField: "state", alignLabels: false, tooltip: am5.Tooltip.new(root, { labelText: "{category}: {value} checks ({valuePercentTotal.formatNumber('0.0')}%)" }) }));
      series.labels.template.set("forceHidden", true);
      series.ticks.template.set("forceHidden", true);
      series.slices.template.setAll({ stroke: am5.color(0x050807), strokeWidth: 4, cornerRadius: 8, cursorOverStyle: "pointer", toggleKey: "none" });
      series.slices.template.adapters.add("fill", (_fill, target) => am5.color(target.dataItem?.dataContext?.color || 0x8b9c8c));
      series.slices.template.adapters.add("stroke", () => am5.color(0x050807));
      series.slices.template.states.create("hover", { scale: 1.04, shiftRadius: 5 });
      chart.seriesContainer.children.push(am5.Label.new(root, { text: `[bold fontSize:34px]${total}[/]\n[fontSize:11px #8B9C8C]TOTAL CHECKS[/]`, centerX: am5.p50, centerY: am5.p50, x: am5.p50, y: am5.p50, textAlign: "center" }));
      series.data.setAll(data.filter((item) => item.value > 0));
      series.appear(750, 100);
    }
    renderChart();
    return () => { cancelled = true; if (root) root.dispose(); };
  }, [data, total]);

  return <div className="grid h-full grid-rows-[1fr_auto]">
    <div ref={chartRef} className="min-h-64 w-full" aria-label={`Scan result distribution across ${total} checks`} />
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{data.map((item) => <div key={item.state} className="rounded-xl border border-white/8 bg-black/20 p-3"><div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: `#${item.color.toString(16).padStart(6, "0")}` }} /><span className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#8B9C8C]">{item.state}</span></div><strong className="mt-2 block text-xl text-white">{item.value}</strong><span className="text-[10px] text-[#8B9C8C]">{total ? Math.round((item.value / total) * 100) : 0}% of checks</span></div>)}</div>
  </div>;
}
