import { Colors } from "@/CONSTANTS";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    padding: 13,
    backgroundColor: Colors.background,
    
  },

  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 30,
    marginRight: 20
  },
  image: {
    width: 210,
    height: 210,
    borderRadius: 16,
    marginBottom: 30,
    marginRight: 30,
    flex: 2.3

  },
  imagePlaceholder: {
    backgroundColor: "#2E2E2E",
    justifyContent: "center",
    alignItems: "center",
  },


  card: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    
  },
  

  objectCard: {
    backgroundColor: "#1E1E1E", 
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333333", 

    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", 
    marginBottom: -12,
  },

  titleContainer: {
    flex: 1,
    marginRight: 12,
  },

  label: {
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
    marginBottom: 4,
  },

  title: {
    fontSize: 22, 
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  rankBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderColor: "rgba(255, 215, 0, 0.5)", 
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20, 
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
    top: 10
  },

  rankText: {
    color: "#FFD700",
    fontSize: 17,
    fontWeight: "bold",
    textShadowColor: "rgba(255, 215, 0, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  divider: {
    height: 1,
    backgroundColor: "#333",
    marginBottom: 16,
  },

  editButton: {
    backgroundColor: "#3A3A3C",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#555",
  },

  buttonText: {
    color: "#E0E0E0",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPrimary: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginVertical: 6,
    alignItems: "center",
  },


  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 12,
    fontSize: 14,
  },

  categoies: {
    paddingVertical: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F5F5F5",
  },

  subBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#242424",
  },
  subcategoies: {
    fontSize: 14,
    color: "#B5B5B5",
    marginBottom: 6,
  },
  subcategory: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#777",
  },

  error: {
    color: "#FF4C4C",
    marginBottom: 8,
    fontSize: 14,
  },

  emptyText: {
    marginVertical: 8,
    color: "#B5B5B5",
    textAlign: "center",
  },
  buttonPrimaryDelete: {
    backgroundColor: "red",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginVertical: 6,
    alignItems: "center",
    
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContainer: {
    backgroundColor: "#1A1A1A",
    padding: 20,
    borderRadius: 16,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 16,
  },

  halfButton: {
    flex: 1,
    marginHorizontal: 6,
  },

  iconMenu: {
    flex: 1,
    // flexDirection: 'row',
    top: -38,
    marginLeft: 0,
    left: 60
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  tagItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#333',
    borderRadius: 20,
    margin: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  tagItemSelected: {
    backgroundColor: '#4A90E2', // Акцентный цвет (синий) при выборе
    borderColor: '#4A90E2',
  },
  tagText: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  previewTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8
  },
  previewTagText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic'
  },
  quoteText: {
    // color: THEME.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  descriptionWrapper: {
    borderLeftWidth: 2,
    borderLeftColor: '#666',
    paddingLeft: 10,
    marginBottom: 0,
    marginTop: 18
  },
  descriptionText: {
    color: '#D0D0D0',
    fontSize: 14,
    fontFamily: 'Inter-Light',
    letterSpacing: 0.4,
    lineHeight: 20,
    // bottom: 15
  },
  modalViewContainer: {
    alignItems: 'center',
    height: '100%',
    width: '100%',
    backgroundColor: "#0D0D0D",
  },
  width100: {
    width: '100%'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10, 
    width: '100%',
  },
  line: {
    flex: 1,            
    height: 1,
    backgroundColor: '#555', 
    opacity: 0.5,
  },
  sectionHeaderText: {
    color: '#aaa',          
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,    
    marginHorizontal: 15,   
    fontFamily: 'System', 
  },

});

export default styles