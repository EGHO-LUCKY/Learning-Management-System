const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  icon: String,
  courseCount: { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true } });

categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
