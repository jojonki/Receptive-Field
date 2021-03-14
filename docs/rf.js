'use strict';

class Variable {
    constructor({ n_in, j_in, r_in, start_in }) {
        this.n_in = n_in
        this.j_in = j_in
        this.r_in = r_in
        this.start_in = start_in
    }
}

class ConvLayer {
    constructor(name, kernel_size, stride, padding, dilation) {
        this.name = name;
        this.kernel_size = kernel_size;
        this.stride = stride;
        this.padding = padding;
        this.dilation = dilation;
    }

    forward(x) {
        let k = this.kernel_size;
        let s = this.stride;
        let p = this.padding;

        let n_in = x.n_in;
        let j_in = x.j_in;
        let r_in = x.r_in;
        // let start_in = x.start_in;
        let start_in = 0.5;

        let n_out = Math.floor((n_in - k + 2 * p) / s) + 1;

        // # calculate actual pad length(sum of both side paddings)
        let total_pad = (k + (n_out - 1) * s) - n_in;
        // # if pad is odd, pad_L is truncated by floor.
        // # e.g.) toal_pad = 3, pad_L = 1, pad_R = 2
        let pad_L = Math.floor(total_pad / 2);
        let pad_R = Math.ceil(total_pad / 2);
        if (pad_L == pad_R) {
            console.assert(p == pad_L, 'padding and pad_L are different')
        }

        let j_out = j_in * s;
        let r_out = r_in + (k - 1) * j_in;
        let start_out = start_in + ((k - 1) / 2 - pad_L) * j_in;
        return new Variable({ 'n_in': n_out, 'j_in': j_out, 'r_in': r_out, 'start_in': start_out });
    }
}


function init() {
    // parameters
    let font = '18px Arial';
    let in_color = "#4285F4";
    let pad_color = "Gray";
    let line_color = "Black";
    // https://coolors.co/palettes/trending
    let layer_colors = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#073b4c"];
    let w = 18;
    let h = w;
    let hw = w / 2;
    let L = parseInt(document.getElementById("textInputSize").value);
    let offset = 2;
    let stride_width = w + offset;
    let stride_height = 80;
    const most_left_x = 420;
    const text_offset_x = 10;

    // initialize
    let stage = new createjs.Stage("rf-canvas");
    let MyNet = [];
    let n_layers = localStorage.getItem('n_layers');
    if (n_layers == null) {
        stage.removeAllChildren();
        stage.update();
        return;
    }

    for (let i = 1; i <= n_layers; i++) {
        let layer_name = 'layer' + i;
        let layer_info = JSON.parse(localStorage.getItem(layer_name));
        MyNet.push(
            new ConvLayer(layer_name, layer_info.kernel, layer_info.stride, layer_info.padding, layer_info.dilation)
        )
    }

    // draw input
    let data = new Variable({ 'n_in': L, 'j_in': 1, 'r_in': 1, 'start_in': 0.5 });
    let y = stride_height;
    let coming_padding = MyNet[0].padding;
    for (let i = 0; i < L; i++) {
        let x = most_left_x + stride_width * i;
        drawRect(stage, x, y, w, h, in_color);
    }
    let begin_offset_list = [most_left_x];
    let end_offset_list = [most_left_x + stride_width * (L - 1)];
    var text = new createjs.Text('Input\nL=' + L, font, in_color);
    text.x = text_offset_x;
    text.y += y;
    stage.addChild(text);

    // draw layers
    let rf_list = [];
    let rep_origin_x = null;
    let left_offset = 0;
    for (let layer = 0; layer < MyNet.length; layer++) {
        let net = MyNet[layer];
        let kernel = net.kernel_size;
        let stride = net.stride;
        let padding = net.padding;
        let dilation = net.dilation;
        let color = layer_colors[layer % layer_colors.length];
        let y = stride_height * (layer + 2);
        let prev_L = L;
        let prev_stride_width = stride_width;
        let prev_left_offset = left_offset;

        L = Math.floor((L - kernel + padding * 2) / stride) + 1;
        if (L <= 0) {
            alert('No more layers can be added.');
            return;
        }
        data = net.forward(data);
        rf_list.push(data.r_in);

        // text
        let layer_info = 'Layer ' + (layer + 1) + "\nK" + kernel + ",S" + stride + ",D" + dilation + ",P" + padding + "\nRF=" + rf_list[rf_list.length - 1]
            + '\nL=' + L;
        let text = new createjs.Text(layer_info, font, color);
        text.x = text_offset_x;
        text.y += y - 30;
        stage.addChild(text);
        // drawLine(stage, most_left_x + left_offset, 0, most_left_x + left_offset, 500, color);

        let half_rf_w = ((data.r_in - 1) * stride_width) / 2;
        left_offset = (data.r_in - 1) * (w + offset) / 2;
        stride_width = stride * stride_width;

        // draw padding into previous layer
        for (let i = 0; i < padding; i++) {
            // left padding
            let prev_y = stride_height * (layer + 1);
            // let prev_x = most_left_x + prev_left_offset - prev_stride_width * (i + 1);
            let prev_x = begin_offset_list[layer] - prev_stride_width * (i + 1);
            drawRect(stage, prev_x, prev_y, w, h, pad_color);
            // right padding
            // prev_x = most_left_x + left_offset + prev_stride_width * (prev_L + i);
            prev_x = end_offset_list[layer] + prev_stride_width * (i + 1);
            drawRect(stage, prev_x, prev_y, w, h, pad_color);
        }

        let data_offset_x = begin_offset_list[layer] - prev_stride_width * padding;
        for (let i = 0; i < L; i++) {
            // let x = most_left_x + left_offset + stride_width * i - prev_stride_width * padding;
            let x = data_offset_x + stride_width * i + ((kernel - 1) * prev_stride_width) / 2;
            if (i == 0) {
                begin_offset_list.push(x);
            } else if (i == L - 1) {
                end_offset_list.push(x);
            }
            let is_focus_ndoe = (layer == n_layers - 1 && i == Math.floor((L - 1) / 2)) ? true : false;
            if (is_focus_ndoe) { // base data for RF
                rep_origin_x = x;
                drawRect(stage, x, y, w, h, 'Green');
            } else {
                drawRect(stage, x, y, w, h, color);
            }

            // draw kernel lines
            let prev_y = y - stride_height + w;
            for (let j = 0; j < kernel; j++) {
                let from_x = (x + hw) - prev_stride_width * (kernel - 1) / 2;
                if (is_focus_ndoe) { // base data for RF
                    drawLine(stage, x + hw, y, from_x + (prev_stride_width) * j, prev_y, 'Green');
                } else {
                    drawLine(stage, x + hw, y, from_x + (prev_stride_width) * j, prev_y, line_color);
                }
            }
        }
    }

    // draw receptive field
    for (let layer = 0; layer < rf_list.length; layer++) {
        let rep_field = rf_list[layer];
        let rep_width = rep_field * (w + offset);
        let rep_x = rep_origin_x - (w + offset) * (rf_list[layer] - 1) / 2 - offset / 2;
        // if (rep_x < most_left_x) {
        // rep_x = most_left_x;
        // }
        let rep_y = stride_height - (hw * (layer + 1)) / 2;
        let color = layer_colors[layer % layer_colors.length];
        drawRect(stage, rep_x, rep_y, rep_width, w + hw * (layer + 1), color, 0.7, true);
    }

    stage.update();
}