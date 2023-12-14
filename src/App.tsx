import "./App.css";
import { useEffect } from "react";
import { bitable, FieldType } from "@lark-base-open/js-sdk";
import { useTranslation } from "react-i18next";
import SignaturePad from "signature_pad";
import { Button, Card, ColorPicker, Dropdown, MenuProps, message, Space, Tooltip } from "antd";
import { BorderOutlined, DeleteOutlined, DownloadOutlined, HighlightOutlined, UndoOutlined, VerticalAlignBottomOutlined } from "@ant-design/icons";
import { Color } from "antd/es/color-picker";
// import './i18n'; // 取消注释以启用国际化

const mimeMap: any = {
	"image/png": ".png",
	"image/jpeg": ".jpg",
	"image/svg+xml": ".svg",
};

const items: MenuProps["items"] = [
	{
		label: "JPG",
		key: "image/jpeg",
	},
	{
		label: "PNG",
		key: "image/png",
	},
	{
		label: "SVG",
		key: "image/svg+xml",
	},
];

let penColor = "#000000";
let backgroundColor = "#ffffff";

export default function App() {
	const translation = useTranslation();
	let signaturePad: any;

	useEffect(() => {
		let canvas: any = document.querySelector("#canvas");
		signaturePad = new SignaturePad(canvas, { penColor, backgroundColor });
		const resizeCanvas = () => {
			const ratio = Math.max(window.devicePixelRatio || 1, 1);
			canvas.width = canvas.offsetWidth * ratio;
			canvas.height = canvas.offsetHeight * ratio;
			canvas.getContext("2d").scale(ratio, ratio);
			signaturePad.fromData(signaturePad.toData());
		};
		window.addEventListener("load", resizeCanvas);
		window.addEventListener("resize", resizeCanvas);
		return () => {
			window.removeEventListener("load", resizeCanvas);
			window.removeEventListener("resize", resizeCanvas);
		};
	}, [translation]);

	const setPenColor = (color: Color) => {
		penColor = color.toHexString();
		signaturePad.penColor = penColor;
	};

	const setBackgroundColor = (color: Color) => {
		backgroundColor = color.toHexString();
		signaturePad.backgroundColor = backgroundColor;
		const data = signaturePad.toData();
		signaturePad.clear();
		signaturePad.fromData(data);
	};

	const clear = () => {
		signaturePad.clear();
	};

	const undo = () => {
		const data = signaturePad.toData();
		if (data) {
			data.pop();
			signaturePad.fromData(data);
		}
	};

	const insertInto: MenuProps["onClick"] = async ({ key: mime }) => {
		message.loading("正在插入", 0);
		let selection = await bitable.base.getSelection();
		if (!(selection.fieldId && selection.recordId)) {
			message.destroy();
			message.info("请选择一个空的附件单元格");
			return;
		}
		let table = await bitable.base.getActiveTable();
		let fieldMeta = await table.getFieldMetaById(selection.fieldId);
		if (fieldMeta.type !== FieldType.Attachment) {
			message.destroy();
			message.info("请选择一个空的附件单元格");
			return;
		}
		let field = await table.getField(fieldMeta.id);
		let fileGenerator = mime === "image/svg+xml" ? generateSvg : generateImg;
		fileGenerator(signaturePad.toDataURL(mime, { includeBackgroundColor: true }), mime)
			.then(async (file: File) => {
				await field.setValue(selection.recordId as string, file);
				message.destroy();
				message.success("插入成功");
			})
			.catch(err => {
				message.destroy();
				message.error(`插入失败：${err.message}`);
			});
	};

	function generateImg(imgUrl: string, mime: string) {
		return new Promise<File>((resolve, reject) => {
			let img = new Image();
			img.src = imgUrl;
			img.onload = () => {
				let canvas = document.createElement("canvas");
				let ctx: any = canvas.getContext("2d");
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0);
				canvas.toBlob(blob => {
					let file = new File([blob as Blob], "signature" + mimeMap[mime], { type: mime });
					resolve(file);
				}, mime);
			};
		});
	}

	const generateSvg = (imgUrl: string, mime: string) => {
		return new Promise<File>((resolve, reject) => {
			const base64Data = imgUrl.split(",")[1];
			const binaryString = window.atob(base64Data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const blob = new Blob([bytes], { type: mime });
			const file = new File([blob], "signature" + mimeMap[mime], { type: mime });
			resolve(file);
		});
	};

	const download: MenuProps["onClick"] = ({ key: mime }) => {
		const link = document.createElement("a");
		link.href = signaturePad.toDataURL(mime, { includeBackgroundColor: true });
		link.download = "signature";
		link.click();
	};

	const extra = (
		<Space>
			<Button type="text" title="清空签名板" icon={<DeleteOutlined />} onClick={clear} size="small"></Button>
			<Button type="text" title="撤销" icon={<UndoOutlined />} onClick={undo} size="small"></Button>
			<ColorPicker value={penColor} defaultValue={penColor} onChangeComplete={setPenColor} disabledAlpha>
				<Button type="text" title="画笔颜色" icon={<HighlightOutlined />} size="small"></Button>
			</ColorPicker>
			<ColorPicker value={backgroundColor} defaultValue={backgroundColor} onChangeComplete={setBackgroundColor} disabledAlpha>
				<Button type="text" title="背景颜色" icon={<BorderOutlined />} size="small"></Button>
			</ColorPicker>
			<Dropdown menu={{ items, onClick: insertInto }} trigger={["click"]}>
				<Button title="请选择一个空的附件单元格，将签名插入其中" type="text" size="small" icon={<VerticalAlignBottomOutlined />} onClick={e => e.preventDefault()}></Button>
			</Dropdown>
			<Dropdown menu={{ items, onClick: download }} trigger={["click"]}>
				<Button title="下载签名" type="text" size="small" icon={<DownloadOutlined />} onClick={e => e.preventDefault()}></Button>
			</Dropdown>
		</Space>
	);

	return (
		<Card title="简易签名板" extra={extra} style={{ width: "90%", margin: "5%" }}>
			<canvas id="canvas" style={{ border: "#8f959e dashed 1px", width: "100%", height: "40vh" }}></canvas>
		</Card>
	);
}
