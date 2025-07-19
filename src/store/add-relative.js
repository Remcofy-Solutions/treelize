import { createNewPerson } from "./new-person"

export function updateGendersForNewRelatives(updated_datum, data) {
  // if gender on main datum is changed, we need to switch mother/father ids for new children
  data.forEach(d => {
    const rd = d._new_rel_data
    if (!rd) return
    if (rd.rel_type === 'spouse') d.data.gender = d.data.gender === 'M' ? 'F' : 'M'
    if (['son', 'daughter'].includes(rd.rel_type)) {
      [d.rels.father, d.rels.mother] = [d.rels.mother, d.rels.father]
    }
  })
}

export function cleanUp(data) {
  for (let i = data.length - 1; i >= 0; i--) {
    const d = data[i]
    if (d._new_rel_data) {
      data.forEach(d2 => {
        if (d2.rels.father === d.id) delete d2.rels.father
        if (d2.rels.mother === d.id) delete d2.rels.mother
        if ((d2.rels.children || []).includes(d.id)) d2.rels.children.splice(d2.rels.children.indexOf(d.id), 1)
        if ((d2.rels.spouses || []).includes(d.id)) d2.rels.spouses.splice(d2.rels.spouses.indexOf(d.id), 1)
      })
      data.splice(i, 1)
    }
  }
}

export function addDatumRelsPlaceholders(datum, store_data, addRelLabels) {
  if (!datum.rels.father) {
    const father = createNewPerson({data: {gender: "M"}, rels: {children: [datum.id]}})
    father._new_rel_data = {rel_type: "father", label: addRelLabels.father, rel_id: datum.id}
    datum.rels.father = father.id
    store_data.push(father)
  }
  if (!datum.rels.mother) {
    const mother = createNewPerson({data: {gender: "F"}, rels: {children: [datum.id]}})
    mother._new_rel_data = {rel_type: "mother", label: addRelLabels.mother, rel_id: datum.id}
    datum.rels.mother = mother.id
    store_data.push(mother)
  }
  const mother = store_data.find(d => d.id === datum.rels.mother)
  const father = store_data.find(d => d.id === datum.rels.father)

  if (!mother.rels.spouses) mother.rels.spouses = []
  if (!father.rels.spouses) father.rels.spouses = []
  if (!mother.rels.spouses.includes(father.id)) mother.rels.spouses.push(father.id)
  if (!father.rels.spouses.includes(mother.id)) father.rels.spouses.push(mother.id)

  if (!mother.rels.children) mother.rels.children = []
  if (!father.rels.children) father.rels.children = []
  if (!mother.rels.children.includes(datum.id)) mother.rels.children.push(datum.id)
  if (!father.rels.children.includes(datum.id)) father.rels.children.push(datum.id)

  if (!datum.rels.spouses) datum.rels.spouses = []

  if (datum.rels.children) {
    let new_spouse;
    datum.rels.children.forEach(child_id => {
      const child = store_data.find(d => d.id === child_id)
      if (!child.rels.mother) {
        if (!new_spouse) new_spouse = createNewPerson({data: {gender: "F"}, rels: {spouses: [datum.id], children: []}})
        new_spouse._new_rel_data = {rel_type: "spouse", label: addRelLabels.spouse, rel_id: datum.id}
        new_spouse.rels.children.push(child.id)
        datum.rels.spouses.push(new_spouse.id)
        child.rels.mother = new_spouse.id
        store_data.push(new_spouse)
      }
      if (!child.rels.father) {
        if (!new_spouse) new_spouse = createNewPerson({data: {gender: "M"}, rels: {spouses: [datum.id], children: []}})
        new_spouse._new_rel_data = {rel_type: "spouse", label: addRelLabels.spouse, rel_id: datum.id}
        new_spouse.rels.children.push(child.id)
        datum.rels.spouses.push(new_spouse.id)
        child.rels.father = new_spouse.id
        store_data.push(new_spouse)
      }
    })
  }

  const spouse_gender = datum.data.gender === "M" ? "F" : "M"
  const new_spouse = createNewPerson({data: {gender: spouse_gender}, rels: {spouses: [datum.id]}})
  new_spouse._new_rel_data = {rel_type: "spouse", label: addRelLabels.spouse, rel_id: datum.id}
  datum.rels.spouses.push(new_spouse.id)
  store_data.push(new_spouse)

  if (!datum.rels.children) datum.rels.children = []
  datum.rels.spouses.forEach(spouse_id => {
    const spouse = store_data.find(d => d.id === spouse_id)
    const mother_id = datum.data.gender === "M" ? spouse.id : datum.id
    const father_id = datum.data.gender === "F" ? spouse.id : datum.id
    if (!spouse.rels.children) spouse.rels.children = []
    
    const new_son = createNewPerson({data: {gender: "M"}, rels: {father: father_id, mother: mother_id}})
    new_son._new_rel_data = {rel_type: "son", label: addRelLabels.son, other_parent_id: spouse.id, rel_id: datum.id}
    spouse.rels.children.push(new_son.id)
    datum.rels.children.push(new_son.id)
    store_data.push(new_son)

    const new_daughter = createNewPerson({data: {gender: "F"}, rels: {mother: mother_id, father: father_id}})
    new_daughter._new_rel_data = {rel_type: "daughter", label: addRelLabels.daughter, other_parent_id: spouse.id, rel_id: datum.id}
    spouse.rels.children.push(new_daughter.id)
    datum.rels.children.push(new_daughter.id)
    store_data.push(new_daughter)
  })

  return store_data
}