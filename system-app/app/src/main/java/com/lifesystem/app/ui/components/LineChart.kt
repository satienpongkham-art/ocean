package com.lifesystem.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Arrangement

/** Small progress chart: label, latest value, and a line through the points (oldest → newest). */
@Composable
fun LineChart(label: String, values: List<Double>, color: Color, format: (Double) -> String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = Txt.sys.copy(color = color))
            Text(values.lastOrNull()?.let(format) ?: "—", style = Txt.num)
        }
        if (values.size < 2) {
            Text("ยังมีข้อมูลไม่พอวาดกราฟ (ต้อง 2 ครั้งขึ้นไป)", style = Txt.sub)
            return@Column
        }
        Canvas(Modifier.fillMaxWidth().height(64.dp)) {
            val min = values.min(); val max = values.max()
            val span = (max - min).takeIf { it > 1e-9 } ?: 1.0
            val pad = 4.dp.toPx()
            fun pt(i: Int, v: Double) = Offset(
                pad + (size.width - 2 * pad) * i / (values.size - 1),
                pad + (size.height - 2 * pad) * (1 - ((v - min) / span)).toFloat(),
            )
            drawLine(color.copy(alpha = 0.15f), Offset(0f, size.height - 1), Offset(size.width, size.height - 1), 1.dp.toPx())
            val path = Path().apply { values.forEachIndexed { i, v -> val p = pt(i, v); if (i == 0) moveTo(p.x, p.y) else lineTo(p.x, p.y) } }
            drawPath(path, color, style = Stroke(2.dp.toPx()))
            values.forEachIndexed { i, v -> drawCircle(color, 2.5.dp.toPx(), pt(i, v)) }
        }
    }
}
