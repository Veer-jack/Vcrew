const hasDraftContent = (d) => Boolean(d.title?.trim() || d.desc?.trim() || d.deadline || d.tasks?.length > 0);
console.log(hasDraftContent({ title: "  ", desc: "", deadline: "", tasks: [] }));
