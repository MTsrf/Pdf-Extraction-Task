const files = require("../models/file");
const { default: mongoose } = require("mongoose");
const { convertBuffer, randomNameGenerator, pdfExtract } = require("../util/utils");
const { PDFDocument } = require("pdf-lib")
const path = require("path")
const fs = require("fs/promises")

exports.fileUploading = async (req, res, next) => {
    const fullUrl = `${req.protocol}://${req.get('host')}/files/${req.file.filename}`;
    console.log(req.file.filename);
    console.log("req.user", req.user)
    try {
        const user = await files.findOne({ user: req.user });
        console.log("req.user", user)
        if (user) {
            await files.updateOne(
                { user: req.user },
                {
                    $push: {
                        pdf: { IsExtract: false, name: req.file.filename, path: fullUrl },
                    },
                }
            );
        } else {
            const newFile = new files({
                user: req.user,
                pdf: [{ IsExtract: false, name: req.file.filename, path: fullUrl }],
            });
            await newFile.save();
        }
        return res.status(200).json({
            message: "Successfully Added",
            statusCode: 200,
        })
    } catch (error) {
        next(error)
    }
}

exports.extractFile = async (req, res, next) => {
    let { selectedPages } = req.body
    try {
        const user = await files.findOne({ user: req.user, 'pdf._id': req.params.id }, { 'pdf.$': 1 });

        const resp = await convertBuffer(user.pdf[0].path)

        const newPdfBytes = await pdfExtract(resp, selectedPages);

        const newName = await randomNameGenerator(user.pdf[0].name);

        const directoryPath = path.join("files", path.dirname(newName));
        await fs.mkdir(directoryPath, { recursive: true });
        await fs.writeFile("files/" + newName, newPdfBytes);

        const fullUrl = `${req.protocol}://${req.get('host')}/files/${newName}`;

        await files.updateOne(
            { user: req.user },
            {
                $push: {
                    pdf: { IsExtract: true, name: newName, path: fullUrl },
                },
            }
        );
        return res.status(200).json({
            message: "Success",
            statusCode: 200,
        })
    } catch (error) {
        next(error)
    }
}

exports.fileFetching = async (req, res, next) => {
    try {
        const user = await files.findOne({ user: req.user });
        return res.status(200).json({
            statusCode: 200,
            data: user,
            message: "Successfully"
        })
    } catch (error) {
        next(error)
    }
}